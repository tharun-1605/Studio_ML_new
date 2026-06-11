import os
import uuid
import zipfile
import shutil
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from models.database import EventModel, get_event, get_all_events, create_event, update_event
from services.drive_sync import index_event_photos, sync_drive_event
from services.face_processor import FaceProcessor
from datetime import datetime

router = APIRouter()

@router.get("/events", response_model=List[EventModel])
def list_events():
    return get_all_events()

@router.post("/events", response_model=EventModel)
def create_new_event(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    mode: str = Form(...),
    drive_link: str = Form(None)
):
    if mode not in ["live", "archive"]:
        raise HTTPException(status_code=400, detail="Invalid mode")
        
    event_id = str(uuid.uuid4())
    event = EventModel(
        id=event_id,
        name=name,
        mode=mode,
        status="pending",
        drive_link=drive_link,
        created_at=datetime.utcnow()
    )
    create_event(event)

    if mode == "live":
        background_tasks.add_task(sync_drive_event, event_id)

    return event

def process_archive_background(event_id: str, zip_path: str):
    event = get_event(event_id)
    if not event:
        return
        
    event.status = "processing"
    update_event(event)
    
    extract_dir = os.path.join("data", "events", event_id, "photos")
    
    # Extract ZIP
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            # Flatten paths or keep structure, but we just want images
            for member in zip_ref.namelist():
                filename = os.path.basename(member)
                # skip directories
                if not filename:
                    continue
                # skip non-images
                if not filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                    continue
                
                source = zip_ref.open(member)
                target_path = os.path.join(extract_dir, filename)
                with open(target_path, "wb") as target:
                    shutil.copyfileobj(source, target)
    except Exception as e:
        print(f"Failed to extract zip: {e}")
        event.status = "failed"
        update_event(event)
        return
    finally:
        os.remove(zip_path) # Clean up zip
        
    processed_count = index_event_photos(event_id)
    event.photo_count = processed_count
    event.status = "completed" if processed_count > 0 else "failed"
    update_event(event)

@router.post("/events/{event_id}/upload-zip")
async def upload_archive_zip(event_id: str, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    event = get_event(event_id)
    if not event or event.mode != "archive":
        raise HTTPException(status_code=400, detail="Invalid event or mode")
        
    os.makedirs("data/temp", exist_ok=True)
    temp_zip_path = f"data/temp/{event_id}.zip"
    
    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    background_tasks.add_task(process_archive_background, event_id, temp_zip_path)
    return {"message": "Upload successful, processing started in background"}

@router.post("/search")
async def search_faces(event_id: str = Form(...), file: UploadFile = File(...)):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    os.makedirs("data/temp", exist_ok=True)
    temp_selfie = f"data/temp/{uuid.uuid4()}_{file.filename}"
    
    with open(temp_selfie, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    processor = FaceProcessor(event_id)
    matches = processor.search_faces(temp_selfie)
    
    # Clean up selfie
    if os.path.exists(temp_selfie):
        os.remove(temp_selfie)
        
    return {"matches": matches}

@router.get("/photos/{event_id}/{filename}")
def get_photo(event_id: str, filename: str):
    photo_path = os.path.join("data", "events", event_id, "photos", filename)
    if os.path.exists(photo_path):
        return FileResponse(photo_path)
    raise HTTPException(status_code=404, detail="Photo not found")
