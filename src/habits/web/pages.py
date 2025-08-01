"""Web routes for static pages (habits, progress)."""

from datetime import date, timedelta
from typing import Any, Dict
from pathlib import Path
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from ..api.dependencies import get_habit_service, DEFAULT_USER_ID
from ..services.habit_tracking_service import HabitTrackingService

# Setup templates
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

router = APIRouter(tags=["pages"])


@router.get("/habits", response_class=HTMLResponse)
async def habits_page(
    request: Request, service: HabitTrackingService = Depends(get_habit_service)
):
    """Habit management page."""
    habits = await service.get_user_habits(DEFAULT_USER_ID)
    return templates.TemplateResponse(
        "habits.html", {"request": request, "habits": habits}
    )


@router.get("/progress", response_class=HTMLResponse)
async def progress_page(
    request: Request, service: HabitTrackingService = Depends(get_habit_service)
):
    """Progress and streaks page."""
    habits = await service.get_user_habits(DEFAULT_USER_ID)
    today = date.today()

    # Calculate streaks for each habit
    habit_streaks = {}
    for habit in habits:
        streak = await service.get_habit_streak(habit.id, today)
        habit_streaks[habit.id] = streak

    # Get last 30 days of progress
    start_date = today - timedelta(days=29)
    progress_days = await service.get_habit_progress(start_date, today)

    # Create a comprehensive calendar data structure
    calendar_data = []
    current_date = start_date

    # Create day data lookup
    day_lookup = {day.date: day for day in progress_days}

    for i in range(30):
        day_info: Dict[str, Any] = {
            "date": current_date,
            "date_str": current_date.isoformat(),
            "day_num": current_date.day,
            "habits": {},
        }

        # Check if we have data for this day
        if current_date in day_lookup:
            day_obj = day_lookup[current_date]
            for entry in day_obj.habit_entries:
                day_info["habits"][entry.habit_id] = {
                    "has_entry": True,
                    "is_completed": entry.is_completed,
                    "completion_value": entry.completion_value,
                    "notes": entry.notes,
                }

        # Ensure all habits have an entry (even if no data)
        for habit in habits:
            if habit.id not in day_info["habits"]:
                day_info["habits"][habit.id] = {
                    "has_entry": False,
                    "is_completed": False,
                    "completion_value": None,
                    "notes": None,
                }

        calendar_data.append(day_info)
        current_date += timedelta(days=1)

    return templates.TemplateResponse(
        "progress.html",
        {
            "request": request,
            "habits": habits,
            "habit_streaks": habit_streaks,
            "progress_days": progress_days,
            "calendar_data": calendar_data,
            "date_range": {"start": start_date, "end": today},
        },
    )