import asyncio
import os
import re
import urllib.parse
import urllib.request

from models.database import get_all_events, get_event, update_event
from services.face_processor import FaceProcessor

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")


def _event_photos_dir(event_id: str) -> str:
    return os.path.join("data", "events", event_id, "photos")


def index_event_photos(event_id: str) -> int:
    processor = FaceProcessor(event_id)
    photos_dir = _event_photos_dir(event_id)
    indexed_photos = set(processor.mapping.values())

    for photo in os.listdir(photos_dir):
        if not photo.lower().endswith(IMAGE_EXTENSIONS):
            continue
        if photo in indexed_photos:
            continue

        photo_path = os.path.join(photos_dir, photo)
        if os.path.isfile(photo_path) and processor.process_image(photo, photo_path):
            indexed_photos.add(photo)

    return len(set(processor.mapping.values()))


def _extract_drive_id(drive_link: str) -> str | None:
    patterns = [
        r"drive\.google\.com/drive/(?:u/\d+/)?folders/([a-zA-Z0-9_-]+)",
        r"drive\.google\.com/file/d/([a-zA-Z0-9_-]+)",
        r"[?&]id=([a-zA-Z0-9_-]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, drive_link)
        if match:
            return match.group(1)

    return None


def _safe_filename(name: str, fallback: str) -> str:
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name).strip()
    return cleaned or fallback


def _download_url(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def _folder_file_ids(folder_id: str) -> list[str]:
    pages = [
        f"https://drive.google.com/embeddedfolderview?id={folder_id}#list",
        f"https://drive.google.com/drive/folders/{folder_id}",
    ]
    file_ids: list[str] = []

    for page in pages:
        try:
            html = _download_url(page)
        except Exception as exc:
            print(f"Failed to read Google Drive folder page: {exc}")
            continue

        matches = re.findall(r"(?:/file/d/|open\?id=)([a-zA-Z0-9_-]+)", html)
        for file_id in matches:
            if file_id not in file_ids:
                file_ids.append(file_id)

    return file_ids


def _download_drive_file(file_id: str, photos_dir: str) -> str | None:
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})

    with urllib.request.urlopen(req, timeout=60) as response:
        content_type = response.headers.get("Content-Type", "")
        if "text/html" in content_type:
            print(f"Google Drive did not return a downloadable file for id {file_id}")
            return None

        disposition = response.headers.get("Content-Disposition", "")
        filename_match = re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)', disposition)
        filename = urllib.parse.unquote(filename_match.group(1)) if filename_match else f"{file_id}.jpg"
        filename = _safe_filename(filename, f"{file_id}.jpg")

        if not filename.lower().endswith(IMAGE_EXTENSIONS):
            print(f"Skipping non-image Drive file: {filename}")
            return None

        target_path = os.path.join(photos_dir, filename)
        if os.path.exists(target_path):
            return target_path

        with open(target_path, "wb") as target:
            target.write(response.read())

    return target_path


def _download_with_gdown(drive_link: str, photos_dir: str) -> bool:
    try:
        import gdown
    except ImportError:
        return False

    try:
        if "/folders/" in drive_link:
            gdown.download_folder(drive_link, output=photos_dir, quiet=False, use_cookies=False)
        else:
            gdown.download(drive_link, output=photos_dir, quiet=False, fuzzy=True, use_cookies=False)
        return True
    except Exception as exc:
        print(f"gdown Drive download failed: {exc}")
        return False


def sync_drive_event(event_id: str):
    event = get_event(event_id)
    if not event or event.mode != "live" or not event.drive_link:
        return

    event.status = "processing"
    update_event(event)

    photos_dir = _event_photos_dir(event_id)
    os.makedirs(photos_dir, exist_ok=True)

    try:
        downloaded = _download_with_gdown(event.drive_link, photos_dir)
        if not downloaded:
            drive_id = _extract_drive_id(event.drive_link)
            if not drive_id:
                raise ValueError("Invalid Google Drive link")

            if "/folders/" in event.drive_link:
                file_ids = _folder_file_ids(drive_id)
                if not file_ids:
                    raise ValueError("No downloadable files found in the Google Drive folder")
                for file_id in file_ids:
                    _download_drive_file(file_id, photos_dir)
            else:
                _download_drive_file(drive_id, photos_dir)

        processed_count = index_event_photos(event_id)
        event.photo_count = processed_count
        event.status = "completed" if processed_count > 0 else "failed"
        update_event(event)
    except Exception as exc:
        print(f"Drive sync failed for event {event_id}: {exc}")
        event.status = "failed"
        update_event(event)


async def drive_sync_loop():
    while True:
        events = get_all_events()
        for event in events:
            if event.mode == "live" and event.status in ("pending", "processing"):
                await asyncio.to_thread(sync_drive_event, event.id)

        await asyncio.sleep(60)


def start_sync_service():
    loop = asyncio.get_event_loop()
    loop.create_task(drive_sync_loop())
