"""API routes for habit management."""

from datetime import date
from fastapi import APIRouter, HTTPException, Depends

from ..domain.models.habit import Habit
from ..domain.models.habit_status import HabitConstraintError
from ..services.habit_tracking_service import HabitTrackingService
from ..utils.logging_config import get_logger
from .dependencies import get_habit_service, DEFAULT_USER_ID
from .models import HabitCreate, HabitCompletionCreate, HabitFailureCreate

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["habits"])


@router.post("/habits")
async def create_habit(
    habit: HabitCreate, service: HabitTrackingService = Depends(get_habit_service)
):
    """Create a new habit."""
    logger.info("API habit creation requested", habit_title=habit.title)

    new_habit = Habit(title=habit.title, description=habit.description)
    await service.add_habit_to_user(DEFAULT_USER_ID, new_habit)

    logger.info(
        "API habit created successfully",
        habit_id=new_habit.id,
        habit_title=new_habit.title,
    )
    return {"message": "Habit created successfully", "habit": new_habit.model_dump()}


@router.delete("/habits/{habit_title}")
async def delete_habit(
    habit_title: str, service: HabitTrackingService = Depends(get_habit_service)
):
    """Delete a habit."""
    logger.info("API habit deletion requested", habit_title=habit_title)

    success = await service.remove_habit_from_user(DEFAULT_USER_ID, habit_title)
    if not success:
        logger.warning("API habit deletion failed - not found", habit_title=habit_title)
        raise HTTPException(status_code=404, detail="Habit not found")

    logger.info("API habit deleted successfully", habit_title=habit_title)
    return {"message": "Habit deleted successfully"}


@router.get("/habits")
async def get_habits(service: HabitTrackingService = Depends(get_habit_service)):
    """Get all user habits."""
    habits = await service.get_user_habits(DEFAULT_USER_ID)
    return {"habits": [habit.model_dump() for habit in habits]}


@router.post("/habits/complete")
async def complete_habit(
    completion: HabitCompletionCreate, service: HabitTrackingService = Depends(get_habit_service)
):
    """Mark a habit as successfully completed for today."""
    logger.info(
        "API habit completion requested",
        habit_id=completion.habit_id,
        has_notes=completion.notes is not None,
    )

    today = date.today()
    
    try:
        habit_entry = await service.record_habit_completion(
            today, completion.habit_id, completion.notes
        )
        
        logger.info(
            "API habit completed successfully",
            habit_id=completion.habit_id,
            status=habit_entry.status.value if habit_entry.status else None
        )
        return {
            "message": "Habit completed successfully",
            "entry": habit_entry.model_dump(),
            "status": habit_entry.status.value if habit_entry.status else None
        }
    except HabitConstraintError as e:
        logger.warning(
            "API habit completion failed - constraint violation",
            habit_id=completion.habit_id,
            error=str(e)
        )
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/habits/fail")
async def fail_habit(
    failure: HabitFailureCreate, service: HabitTrackingService = Depends(get_habit_service)
):
    """Mark a habit attempt as failed for today."""
    logger.info(
        "API habit failure requested",
        habit_id=failure.habit_id,
        has_notes=failure.notes is not None,
    )

    today = date.today()
    
    try:
        habit_entry = await service.record_habit_failure(
            today, failure.habit_id, failure.notes
        )
        
        logger.info(
            "API habit failure recorded successfully",
            habit_id=failure.habit_id,
            status=habit_entry.status.value if habit_entry.status else None
        )
        return {
            "message": "Habit failure recorded",
            "entry": habit_entry.model_dump(),
            "status": habit_entry.status.value if habit_entry.status else None
        }
    except HabitConstraintError as e:
        logger.warning(
            "API habit failure recording failed - constraint violation",
            habit_id=failure.habit_id,
            error=str(e)
        )
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/streaks/{habit_id}")
async def get_habit_streak(
    habit_id: str, service: HabitTrackingService = Depends(get_habit_service)
):
    """Get current streak for a habit."""
    today = date.today()
    streak = await service.get_habit_streak(habit_id, today)
    return {"habit_id": habit_id, "streak": streak}