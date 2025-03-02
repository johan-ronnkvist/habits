import io
import json
import os.path

import structlog
from fastapi import APIRouter, Request
from google_auth_oauthlib.flow import Flow
from starlette.responses import RedirectResponse
from google.oauth2.credentials import Credentials
import googleapiclient
import googleapiclient.http
import googleapiclient.discovery

logger = structlog.get_logger()

router = APIRouter(prefix="/auth")


CLIENT_SECRETS_FILE = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "res",
        "secrets",
        "client_secret.json",
    )
)
SCOPES = ["https://www.googleapis.com/auth/drive.appdata"]
REDIRECT_URI = "http://localhost:8000/auth/callback"

flow = Flow.from_client_secrets_file(
    CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
)

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"


@router.get("/login")
def login():
    auth_url, _ = flow.authorization_url(prompt="consent")
    return RedirectResponse(auth_url)


@router.get("/callback")
def auth_callback(request: Request):
    flow.fetch_token(authorization_response=str(request.url))
    credentials = flow.credentials
    os.environ["HABITS_ACCESS_TOKEN"] = credentials.token
    return {"access_token": credentials.token}


def get_drive_client(access_token: str):
    credentials = Credentials(token=access_token)
    return googleapiclient.discovery.build("drive", "v3", credentials=credentials)


def save_data(access_token: str, data: dict, filename: str):
    drive = get_drive_client(access_token)

    contents = json.dumps(data).encode()

    query = f"name='{filename}' and trashed=false and parents in 'appDataFolder'"
    existing_files = drive.files().list(q=query, spaces="appDataFolder").execute()

    if existing_files.get("files"):
        file_id = existing_files["files"][0]["id"]
        drive.files().update(
            fileId=file_id,
            media_body=googleapiclient.http.MediaIoBaseUpload(
                io.BytesIO(contents),
                mimetype="application/json",
                resumable=True,
            ),
        ).execute()
    else:
        # Create new file in AppData folder
        file_metadata = {
            "name": filename,
            "parents": ["appDataFolder"],
        }
        drive.files().create(
            body=file_metadata,
            media_body=googleapiclient.http.MediaIoBaseUpload(
                io.BytesIO(contents),
                mimetype="application/json",
                resumable=True,
            ),
        ).execute()
