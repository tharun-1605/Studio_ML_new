import asyncio
from models.database import get_all_events, update_event

async def mock_drive_sync():
    """
    Mock service that pretends to sync Google Drive.
    In a real scenario, this would use google-api-python-client.
    """
    while True:
        events = get_all_events()
        for event in events:
            if event.mode == 'live' and event.status != 'failed':
                # Just mock logging for now
                pass
                
        await asyncio.sleep(60) # check every minute

def start_sync_service():
    loop = asyncio.get_event_loop()
    loop.create_task(mock_drive_sync())
