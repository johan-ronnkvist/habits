import json

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def get_drive_service(token):
    creds = Credentials(token)
    return build("drive", "v3", credentials=creds)


def save_user_data(token, filename, data):
    service = get_drive_service(token)

    # Convert data to JSON
    file_metadata = {
        "name": filename,
        "parents": ["appDataFolder"],  # App-specific storage in user's Drive
    }

    media = service.files().create(
        body=file_metadata, media_body=json.dumps(data), fields="id"
    )
    return {"file_id": media.get("id")}


def load_user_data(token, filename):
    service = get_drive_service(token)

    # Search for file in appDataFolder
    response = (
        service.files()
        .list(
            q=f"name='{filename}' and 'appDataFolder' in parents",
            spaces="drive",
            fields="files(id, name)",
        )
        .execute()
    )

    files = response.get("files", [])
    if not files:
        return {"error": "File not found"}

    file_id = files[0]["id"]
    request = service.files().get_media(fileId=file_id)
    content = request.execute()

    return json.loads(content)
