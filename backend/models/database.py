from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pymongo import MongoClient

# Initialize MongoDB client
try:
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    db = client.studio_ml
    events_collection = db.events
    guests_collection = db.guests
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")

class GuestModel(BaseModel):
    id: str
    event_id: str
    name: str
    phone: str
    selfie_path: str
    created_at: datetime
    notified: bool = False

class EventModel(BaseModel):
    id: str
    name: str
    mode: str  # "live" or "archive"
    status: str # "active", "processing", "completed"
    drive_link: Optional[str] = None
    created_at: datetime
    photo_count: int = 0

def get_event(event_id: str) -> Optional[EventModel]:
    data = events_collection.find_one({"id": event_id})
    if data:
        # Remove MongoDB _id before creating EventModel
        data.pop('_id', None)
        return EventModel(**data)
    return None

def get_all_events() -> List[EventModel]:
    cursor = events_collection.find()
    events = []
    for data in cursor:
        data.pop('_id', None)
        events.append(EventModel(**data))
    return events

def create_event(event: EventModel):
    events_collection.insert_one(event.model_dump(mode='json'))
    
    # Create event directories
    event_dir = os.path.join("data", "events", event.id)
    os.makedirs(os.path.join(event_dir, "photos"), exist_ok=True)
    os.makedirs(os.path.join(event_dir, "index"), exist_ok=True)

def update_event(event: EventModel):
    events_collection.update_one(
        {"id": event.id},
        {"$set": event.model_dump(mode='json')}
    )

def delete_event(event_id: str):
    events_collection.delete_one({"id": event_id})
        
    event_dir = os.path.join("data", "events", event_id)
    if os.path.exists(event_dir):
        shutil.rmtree(event_dir)

def create_guest(guest: GuestModel):
    guests_collection.insert_one(guest.model_dump(mode='json'))

def get_guests_by_event(event_id: str) -> List[GuestModel]:
    cursor = guests_collection.find({"event_id": event_id})
    guests = []
    for data in cursor:
        data.pop('_id', None)
        guests.append(GuestModel(**data))
    return guests

def update_guest(guest: GuestModel):
    guests_collection.update_one(
        {"id": guest.id},
        {"$set": guest.model_dump(mode='json')}
    )

