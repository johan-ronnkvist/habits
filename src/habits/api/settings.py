"""API routes for user settings management."""

from fastapi import APIRouter, HTTPException, Depends

from ..services.habit_tracking_service import HabitTrackingService
from ..utils.logging_config import get_logger
from ..utils.region_config import (
    get_default_week_start_day,
    get_available_week_start_options,
)
from .dependencies import get_habit_service, DEFAULT_USER_ID
from .models import UserSettingsUpdate

logger = get_logger(__name__)
router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/")
async def get_user_settings(service: HabitTrackingService = Depends(get_habit_service)):
    """Get current user settings."""
    logger.info("API user settings requested")

    # Get user config to retrieve current settings
    config = await service.config_repo.get_config(DEFAULT_USER_ID)

    if config:
        week_start_day = config.week_start_day
    else:
        # Return region-based default if no config exists
        week_start_day = get_default_week_start_day()

    settings = {
        "week_start_day": week_start_day,
        "week_start_day_options": get_available_week_start_options(),
        "default_week_start_day": get_default_week_start_day(),
    }

    logger.info("API user settings retrieved", week_start_day=week_start_day)
    return {"settings": settings}


@router.put("/")
async def update_user_settings(
    settings: UserSettingsUpdate,
    service: HabitTrackingService = Depends(get_habit_service),
):
    """Update user settings."""
    logger.info(
        "API user settings update requested", week_start_day=settings.week_start_day
    )

    success = await service.update_user_settings(
        DEFAULT_USER_ID, settings.week_start_day
    )
    if not success:
        logger.warning("API user settings update failed")
        raise HTTPException(status_code=500, detail="Failed to update settings")

    logger.info(
        "API user settings updated successfully", week_start_day=settings.week_start_day
    )
    return {
        "message": "Settings updated successfully",
        "settings": settings.model_dump(),
    }
