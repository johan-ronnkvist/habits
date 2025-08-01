from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .api.habits import router as habits_router
from .api.entries import router as entries_router
from .web.dashboard import router as dashboard_router
from .web.pages import router as pages_router
from .web.forms import router as forms_router
from .utils.logging_config import configure_logging, get_logger

# Configure logging
configure_logging(level="INFO", json_format=False, service_name="habits-tracker")
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    logger.info("Starting Habits Tracker application")
    yield
    # Shutdown
    logger.info("Shutting down Habits Tracker application")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Habits Tracker",
    description="Simple habit tracking application",
    lifespan=lifespan,
)


# Setup static files
BASE_DIR = Path(__file__).resolve().parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

# Include routers
app.include_router(habits_router)
app.include_router(entries_router)
app.include_router(pages_router)
app.include_router(forms_router)
app.include_router(
    dashboard_router
)  # Include dashboard router last for catch-all route


def main():
    """Main entry point for running the application."""
    import uvicorn

    logger.info("Starting uvicorn server", host="0.0.0.0", port=8000)
    uvicorn.run("habits.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    main()
