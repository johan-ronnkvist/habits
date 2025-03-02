import os.path

import structlog
from fastapi import APIRouter, Request
from google_auth_oauthlib.flow import Flow
from starlette.responses import RedirectResponse

logger = structlog.get_logger()

router = APIRouter()

# Load Google OAuth Client Config


CLIENT_SECRETS_FILE = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "res", "cfg", "client_secret.json"
    )
)
SCOPES = ["https://www.googleapis.com/auth/drive.appdata"]  # Limited to app's data
REDIRECT_URI = "http://localhost:8000/auth/callback"

flow = Flow.from_client_secrets_file(
    CLIENT_SECRETS_FILE, scopes=SCOPES, redirect_uri=REDIRECT_URI
)


@router.get("/auth/login")
def login():
    logger.debug("Redirecting to Google OAuth")
    auth_url, _ = flow.authorization_url(prompt="consent")
    logger.debug("Redirect URL", url=auth_url)
    return RedirectResponse(auth_url)


@router.get("/auth/callback")
def auth_callback(request: Request):
    flow.fetch_token(authorization_response=str(request.url))
    credentials = flow.credentials
    return {"access_token": credentials.token}
