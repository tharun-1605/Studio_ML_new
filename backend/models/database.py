from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import os
import shutil

DB_FILE = "data/events.json"

class EventModel(BaseModel):
    id: str
    name: str
    mode: str  # "live" or "archive"
    status: str # "active", "processing", "completed"
    drive_link: Optional[str] = None
    created_at: datetime
    photo_count: int = 0

def _load_db() -> dict:
    if not os.path.exists(DB_FILE):
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, "w") as f:
            json.dump({}, f)
        return {}
    with open(DB_FILE, "r") as f:
        return json.load(f)

def _save_db(data: dict):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

def get_event(event_id: str) -> Optional[EventModel]:
    db = _load_db()
    if event_id in db:
        return EventModel(**db[event_id])
    return None

def get_all_events() -> List[EventModel]:
    db = _load_db()
    return [EventModel(**v) for v in db.values()]

def create_event(event: EventModel):
    db = _load_db()
    db[event.id] = event.model_dump(mode='json')
    _save_db(db)
    
    # Create event directories
    event_dir = os.path.join("data", "events", event.id)
    os.makedirs(os.path.join(event_dir, "photos"), exist_ok=True)
    os.makedirs(os.path.join(event_dir, "index"), exist_ok=True)

def update_event(event: EventModel):
    db = _load_db()
    if event.id in db:
        db[event.id] = event.model_dump(mode='json')
        _save_db(db)

def delete_event(event_id: str):
    db = _load_db()
    if event_id in db:
        del db[event_id]
        _save_db(db)
        
    event_dir = os.path.join("data", "events", event_id)
    if os.path.exists(event_dir):
        shutil.rmtree(event_dir)

