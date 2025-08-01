"""API routes for habit entry management."""

from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends

from ..services.habit_tracking_service import HabitTrackingService
from ..utils.logging_config import get_logger
from .dependencies import get_habit_service
from .models import HabitEntryCreate

logger = get_logger(__name__)
router = APIRouter(prefix="/api", tags=["entries"])


@router.post("/entries")
async def record_entry(
    entry: HabitEntryCreate, service: HabitTrackingService = Depends(get_habit_service)
):
    """Record a habit entry for today."""
    logger.info(
        "API entry recording requested",
        habit_id=entry.habit_id,
        completion_value=entry.completion_value,
        has_notes=entry.notes is not None,
    )

    today = date.today()
    
    # Check if we're trying to complete a habit (completion_value >= 0)
    if entry.completion_value is not None and entry.completion_value >= 0:
        # Use the safe completion method
        habit_entry, was_already_completed = await service.complete_habit_if_not_already(
            today, entry.habit_id, entry.completion_value, entry.notes
        )
        
        if was_already_completed:
            logger.info(
                "API entry recording - habit already completed",
                habit_id=entry.habit_id,
                existing_completion_value=habit_entry.completion_value
            )
            return {
                "message": "Habit already completed for today",
                "entry": habit_entry.model_dump(),
                "was_already_completed": True
            }
    else:
        # For non-completion entries (notes updates, marking incomplete), use regular method
        habit_entry = await service.record_habit_entry(
            today, entry.habit_id, entry.completion_value, entry.notes
        )
        was_already_completed = False

    logger.info(
        "API entry recorded successfully",
        habit_id=entry.habit_id,
        is_completed=habit_entry.is_completed,
        was_already_completed=was_already_completed
    )
    return {
        "message": "Entry recorded successfully",
        "entry": habit_entry.model_dump(),
        "was_already_completed": was_already_completed
    }


@router.get("/summary/{target_date}")
async def get_daily_summary(
    target_date: str, service: HabitTrackingService = Depends(get_habit_service)
):
    """Get daily summary for a specific date."""
    try:
        parsed_date = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Invalid date format. Use YYYY-MM-DD"
        )

    summary = await service.get_daily_summary(parsed_date)
    if not summary:
        return {"message": "No data for this date", "date": target_date}
    return summary