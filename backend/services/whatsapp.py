import logging

logger = logging.getLogger(__name__)

def send_photos_to_whatsapp(phone: str, match_urls: list, event_name: str):
    """
    Mock WhatsApp service to notify user about their photos.
    In a real implementation, you would use Twilio or Meta WhatsApp Cloud API.
    """
    print("=" * 50)
    print(f"WHATSAPP MESSAGE SENT TO: {phone}")
    print(f"Hello! Your photos from '{event_name}' are ready.")
    print(f"We found {len(match_urls)} photos of you:")
    for url in match_urls:
        print(f" - {url}")
    print("=" * 50)
    
    logger.info(f"WhatsApp notification sent to {phone} for event {event_name} with {len(match_urls)} photos.")
    return True
