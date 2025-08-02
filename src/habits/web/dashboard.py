"""Web routes for dashboard and date navigation."""

from datetime import date, timedelta
from typing import Any, Dict
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from ..api.dependencies import get_habit_service, DEFAULT_USER_ID
from ..services.habit_tracking_service import HabitTrackingService
from ..utils.date_parser import (
    parse_url_date,
    get_navigation_dates,
    DateParseError,
    format_date_for_url,
)
from ..utils.logging_config import get_logger

logger = get_logger(__name__)

# Setup templates
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

router = APIRouter(tags=["dashboard"])


async def get_weekly_overview(
    target_date: date, service: HabitTrackingService
) -> dict:
    """Get weekly overview data for the dashboard."""
    # Get start of week (Monday) for the target date
    days_since_monday = target_date.weekday()
    week_start = target_date - timedelta(days=days_since_monday)

    # Generate 7 days of the week
    week_days = []
    today = date.today()

    for i in range(7):
        day_date = week_start + timedelta(days=i)
        is_past = day_date < today
        is_today = day_date == today
        is_future = day_date > today

        # Get day data
        day_data = await service.day_repo.get_day(day_date)
        habit_entries = day_data.habit_entries if day_data else []

        # Calculate completion stats
        total_habits = len(await service.get_user_habits(DEFAULT_USER_ID))
        completed_habits = sum(1 for entry in habit_entries if entry.is_completed)
        failed_habits = sum(1 for entry in habit_entries if entry.is_failed)

        completion_rate = completed_habits / total_habits if total_habits > 0 else 0

        # Determine status
        if is_future:
            status = "future"
        elif total_habits == 0:
            status = "no-habits"
        elif completed_habits == total_habits:
            status = "perfect"
        elif completion_rate >= 0.8:
            status = "great"
        elif completion_rate >= 0.5:
            status = "good"
        elif completed_habits > 0:
            status = "partial"
        else:
            status = "none"

        week_days.append(
            {
                "date": day_date,
                "day_name": day_date.strftime("%a"),  # Mon, Tue, etc.
                "day_number": day_date.day,
                "is_today": is_today,
                "is_past": is_past,
                "is_future": is_future,
                "can_navigate": is_past or is_today,
                "url": format_date_for_url(day_date) if (is_past or is_today) else None,
                "total_habits": total_habits,
                "completed_habits": completed_habits,
                "failed_habits": failed_habits,
                "completion_rate": completion_rate,
                "status": status,
            }
        )

    # Calculate weekly stats
    total_possible = 0
    total_completed = 0
    for day in week_days:
        if day["is_past"] or day["is_today"]:
            total_possible += int(day["total_habits"])
            total_completed += int(day["completed_habits"])
    weekly_completion_rate = (
        total_completed / total_possible if total_possible > 0 else 0
    )

    # Determine weekly status
    if weekly_completion_rate >= 0.9:
        weekly_status = "excellent"
    elif weekly_completion_rate >= 0.8:
        weekly_status = "great"
    elif weekly_completion_rate >= 0.6:
        weekly_status = "good"
    elif weekly_completion_rate >= 0.4:
        weekly_status = "fair"
    else:
        weekly_status = "needs-work"

    return {
        "week_days": week_days,
        "week_start": week_start,
        "total_possible": total_possible,
        "total_completed": total_completed,
        "weekly_completion_rate": weekly_completion_rate,
        "weekly_status": weekly_status,
    }


async def get_dashboard_data(
    target_date: date, service: HabitTrackingService
) -> dict:
    """Get dashboard data for a specific date."""
    habits = await service.get_user_habits(DEFAULT_USER_ID)
    daily_summary = await service.get_daily_summary(target_date)

    # Get day data for the target date
    target_day = await service.day_repo.get_day(target_date)
    habit_entries = target_day.habit_entries if target_day else []

    # Create habit status dictionary
    habit_status = {}
    for entry in habit_entries:
        habit_status[entry.habit_id] = {
            "completed": entry.is_completed,
            "failed": entry.is_failed,
            "completion_value": entry.completion_value,
            "status": entry.status
            if isinstance(entry.status, str)
            else (entry.status.value if entry.status else None),
            "notes": entry.notes,
        }

    # Get navigation data
    navigation = get_navigation_dates(target_date)

    # Get weekly overview data
    weekly_overview = await get_weekly_overview(target_date, service)

    return {
        "habits": habits,
        "target_date": target_date,
        "daily_summary": daily_summary,
        "habit_status": habit_status,
        "navigation": navigation,
        "weekly_overview": weekly_overview,
    }


@router.get("/", response_class=HTMLResponse)
async def dashboard(
    request: Request, service: HabitTrackingService = Depends(get_habit_service)
):
    """Main dashboard showing today's habits."""
    logger.info(
        "Dashboard accessed", user_agent=request.headers.get("user-agent", "unknown")
    )

    today = date.today()
    data = await get_dashboard_data(today, service)

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            **data,
        },
    )


@router.get("/today", response_class=HTMLResponse)
async def today_dashboard(
    request: Request, service: HabitTrackingService = Depends(get_habit_service)
):
    """Dashboard for today (explicit URL)."""
    logger.info("Today dashboard accessed")

    today = date.today()
    data = await get_dashboard_data(today, service)

    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            **data,
        },
    )


@router.get("/{date_path:path}", response_class=HTMLResponse)
async def date_dashboard(
    request: Request,
    date_path: str,
    service: HabitTrackingService = Depends(get_habit_service),
):
    """Dashboard for specific date from URL path."""
    try:
        target_date = parse_url_date(date_path)
        logger.info(
            "Date dashboard accessed",
            date_path=date_path,
            parsed_date=target_date.isoformat(),
        )

        data = await get_dashboard_data(target_date, service)

        return templates.TemplateResponse(
            "dashboard.html",
            {
                "request": request,
                **data,
            },
        )
    except DateParseError as e:
        logger.warning("Invalid date path", date_path=date_path, error=str(e))
        raise HTTPException(status_code=404, detail=f"Invalid date format: {date_path}")
    except Exception as e:
        logger.error("Date dashboard error", date_path=date_path, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")
