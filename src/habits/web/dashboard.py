"""Web routes for dashboard and date navigation."""

from datetime import date
from typing import Any, Dict
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from ..api.dependencies import get_habit_service, DEFAULT_USER_ID
from ..services.habit_tracking_service import HabitTrackingService
from ..utils.date_parser import parse_url_date, get_navigation_dates, DateParseError
from ..utils.logging_config import get_logger

logger = get_logger(__name__)

# Setup templates
BASE_DIR = Path(__file__).resolve().parent.parent
templates = Jinja2Templates(directory=BASE_DIR / "templates")

router = APIRouter(tags=["dashboard"])


async def get_dashboard_data(
    target_date: date, service: HabitTrackingService
) -> Dict[str, Any]:
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

    return {
        "habits": habits,
        "target_date": target_date,
        "daily_summary": daily_summary,
        "habit_status": habit_status,
        "navigation": navigation,
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
