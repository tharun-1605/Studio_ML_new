import os
import uuid
import zipfile
import shutil
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse

from models.database import (
    EventModel, get_event, get_all_events, create_event, update_event, delete_event,
    GuestModel, create_guest, get_guests_by_event, update_guest,
    UserModel, create_user, get_user_by_username, hash_password, verify_password
)
from services.drive_sync import index_event_photos, sync_drive_event
from services.face_processor import FaceProcessor
from services.whatsapp import send_photos_to_whatsapp
from datetime import datetime

router = APIRouter()

@router.get("/events", response_model=List[EventModel])
def list_events():
    return get_all_events()

@router.get("/events/{event_id}", response_model=EventModel)
def get_single_event(event_id: str):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.delete("/events/{event_id}")
def delete_existing_event(event_id: str):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    delete_event(event_id)
    return {"message": "Event deleted successfully"}

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

    # Automatically process guests and send WhatsApp messages
    if event.status == "completed":
        guests = get_guests_by_event(event_id)
        if guests:
            processor = FaceProcessor(event_id)
            for guest in guests:
                if not guest.notified and os.path.exists(guest.selfie_path):
                    matches = processor.search_faces(guest.selfie_path)
                    if matches:
                        # Construct a mock photo URL base (in a real app, use the actual domain from env)
                        base_url = os.getenv("API_PUBLIC_URL", "http://localhost:8080/api/photos")
                        match_urls = [f"{base_url}/{event_id}/{m}" for m in matches]
                        send_photos_to_whatsapp(guest.phone, match_urls, event.name)
                        guest.notified = True
                        update_guest(guest)

@router.post("/guests/register")
def register_guest(
    event_id: str = Form(...),
    name: str = Form(...),
    phone: str = Form(...),
    file: UploadFile = File(...),
    referrer: str = Form(None)
):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    os.makedirs("data/guests", exist_ok=True)
    guest_id = str(uuid.uuid4())
    selfie_path = f"data/guests/{guest_id}_{file.filename}"
    
    with open(selfie_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    guest = GuestModel(
        id=guest_id,
        event_id=event_id,
        name=name,
        phone=phone,
        selfie_path=selfie_path,
        created_at=datetime.utcnow(),
        referrer=referrer
    )
    create_guest(guest)
    
    matches = []
    if event.status == "completed" or (event.mode == "live" and getattr(event, "photo_count", 0) > 0):
        processor = FaceProcessor(event_id)
        matches = processor.search_faces(selfie_path)
        if matches:
            base_url = os.getenv("API_PUBLIC_URL", "http://localhost:8080/api/photos")
            match_urls = [f"{base_url}/{event_id}/{m}" for m in matches]
            send_photos_to_whatsapp(phone, match_urls, event.name)
            guest.notified = True
            update_guest(guest)
            
    return {
        "message": "Registration successful. You will receive photos on WhatsApp when ready.",
        "matches": matches
    }



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

@router.get("/events/{event_id}/guests", response_model=List[GuestModel])
def list_event_guests(event_id: str):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return get_guests_by_event(event_id)

@router.post("/auth/register")
def register_user(
    username: str = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    phone: str = Form(...),
    file: UploadFile = File(None),
    role: str = Form("guest"),
    referrer: str = Form(None)
):
    existing = get_user_by_username(username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
        
    selfie_path = None
    if file and file.filename:
        os.makedirs("data/selfies", exist_ok=True)
        user_id_temp = str(uuid.uuid4())
        selfie_path = f"data/selfies/{user_id_temp}_{file.filename}"
        with open(selfie_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
    user_id = str(uuid.uuid4())
    user = UserModel(
        id=user_id,
        username=username,
        password_hash=hash_password(password),
        name=name,
        phone=phone,
        selfie_path=selfie_path,
        role=role,
        created_at=datetime.utcnow(),
        referrer=referrer
    )
    create_user(user)
    
    user_data = user.model_dump()
    user_data.pop("password_hash", None)
    return user_data

@router.post("/auth/login")
def login_user(
    username: str = Form(...),
    password: str = Form(...)
):
    user = get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid username or password")
        
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid username or password")
        
    user_data = user.model_dump()
    user_data.pop("password_hash", None)
    return user_data

@router.get("/auth/selfie/{username}")
def get_user_selfie(username: str):
    user = get_user_by_username(username)
    if not user or not user.selfie_path:
        raise HTTPException(status_code=404, detail="Selfie not found")
    if os.path.exists(user.selfie_path):
        return FileResponse(user.selfie_path)
    raise HTTPException(status_code=404, detail="Selfie file not found")

@router.post("/events/{event_id}/search-user-selfie")
def search_user_selfie(event_id: str, username: str = Form(...)):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    user = get_user_by_username(username)
    if not user or not user.selfie_path:
        raise HTTPException(status_code=400, detail="User profile or selfie not found")
        
    processor = FaceProcessor(event_id)
    matches = processor.search_faces(user.selfie_path)
    return {"matches": matches}

@router.post("/events/{event_id}/register-guest-user")
def register_guest_user(event_id: str, username: str = Form(...)):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    user = get_user_by_username(username)
    if not user or not user.selfie_path:
        raise HTTPException(status_code=400, detail="User profile or selfie not found")
        
    existing_guests = get_guests_by_event(event_id)
    for g in existing_guests:
        if g.phone == user.phone:
            return {"message": "Already registered for notifications"}
            
    guest_id = str(uuid.uuid4())
    guest = GuestModel(
        id=guest_id,
        event_id=event_id,
        name=user.name,
        phone=user.phone,
        selfie_path=user.selfie_path,
        created_at=datetime.utcnow(),
        referrer=user.referrer,
        notified=False
    )
    create_guest(guest)
    
    matches = []
    if event.status == "completed" or (event.mode == "live" and getattr(event, "photo_count", 0) > 0):
        processor = FaceProcessor(event_id)
        matches = processor.search_faces(user.selfie_path)
        if matches:
            base_url = os.getenv("API_PUBLIC_URL", "http://localhost:8080/api/photos")
            match_urls = [f"{base_url}/{event_id}/{m}" for m in matches]
            send_photos_to_whatsapp(user.phone, match_urls, event.name)
            guest.notified = True
            update_guest(guest)
            
    return {
        "message": "Subscribed to notifications successfully. Matches searched immediately.",
        "matches": matches
    }

