"""Shared dependencies for API routes."""

from ..repositories.json_storage import JsonDayRepository, JsonUserConfigRepository
from ..services.habit_tracking_service import HabitTrackingService

# Initialize repositories and service
day_repo = JsonDayRepository("data/days")
config_repo = JsonUserConfigRepository("data/configs")
habit_service = HabitTrackingService(day_repo, config_repo)

# Default user ID for single-user mode
DEFAULT_USER_ID = "default_user"


async def get_habit_service() -> HabitTrackingService:
    """Dependency to get habit service."""
    return habit_service
