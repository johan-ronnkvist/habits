"""Web routes for form handling."""

from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import RedirectResponse

from ..api.dependencies import get_habit_service, DEFAULT_USER_ID
from ..domain.models.habit import Habit
from ..domain.models.habit_status import HabitConstraintError
from ..services.habit_tracking_service import HabitTrackingService
from ..utils.date_parser import format_date_for_url

router = APIRouter(tags=["forms"])


@router.post("/habits/create")
async def create_habit_form(
    request: Request,
    title: str = Form(...),
    description: str = Form(...),
    service: HabitTrackingService = Depends(get_habit_service),
):
    """Handle habit creation from form."""
    new_habit = Habit(title=title, description=description)
    await service.add_habit_to_user(DEFAULT_USER_ID, new_habit)
    return RedirectResponse(url="/habits", status_code=303)


@router.post("/habits/delete/{habit_title}")
async def delete_habit_form(
    habit_title: str, service: HabitTrackingService = Depends(get_habit_service)
):
    """Handle habit deletion from form."""
    await service.remove_habit_from_user(DEFAULT_USER_ID, habit_title)
    return RedirectResponse(url="/habits", status_code=303)


@router.post("/entries/record")
async def record_entry_form(
    request: Request,
    habit_id: str = Form(...),
    action: str = Form(...),  # "complete" or "fail"
    notes: Optional[str] = Form(None),
    target_date_str: Optional[str] = Form(
        None
    ),  # Hidden field with current date context
    service: HabitTrackingService = Depends(get_habit_service),
):
    """Handle habit entry recording from form with explicit actions."""
    # Determine the target date - use form field if provided, otherwise today
    if target_date_str:
        try:
            target_date = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        except ValueError:
            target_date = date.today()
    else:
        target_date = date.today()

    try:
        if action == "complete":
            await service.record_habit_completion(target_date, habit_id, notes)
        elif action == "fail":
            await service.record_habit_failure(target_date, habit_id, notes)
        else:
            # For backward compatibility, fall back to legacy method
            completion_value = 1 if action == "complete" else -1
            await service.record_habit_entry(
                target_date, habit_id, completion_value, notes
            )
    except HabitConstraintError:
        # Constraint violation - habit already recorded
        # For web form, we just redirect regardless - user will see current state
        pass

    # Redirect back to the same date view
    date_url = format_date_for_url(target_date)
    redirect_url = f"/{date_url}" if date_url != "today" else "/today"

    return RedirectResponse(url=redirect_url, status_code=303)
