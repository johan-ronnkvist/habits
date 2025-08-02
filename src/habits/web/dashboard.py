"""Web routes for dashboard and date navigation."""

from datetime import date, timedelta
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from ..api.dependencies import get_habit_service, DEFAULT_USER_ID
from ..services.habit_tracking_service import HabitTrackingService
from ..services.weekly_analysis_service import WeeklyAnalysisService
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


async def get_weekly_overview(target_date: date, service: HabitTrackingService) -> dict:
    """Get weekly overview data showing daily progress in the context of weekly goals."""
    # Get user's week start day
    user_config = await service.config_repo.get_config(DEFAULT_USER_ID)
    week_start_day = user_config.week_start_day if user_config else 1

    # Calculate week boundaries
    weekly_service = WeeklyAnalysisService(service.day_repo, service.config_repo)
    week_start, week_end = weekly_service.get_week_boundaries(
        target_date, week_start_day
    )

    # Get weekly goal progress
    weekly_progress = await weekly_service.get_weekly_goal_progress(
        DEFAULT_USER_ID, target_date
    )

    # Get all habits to understand which ones don't have weekly targets
    all_habits = await service.get_user_habits(DEFAULT_USER_ID)
    habits_with_targets = [h for h in all_habits if h.contributes_to_weekly_success()]
    habits_without_targets = [
        h for h in all_habits if not h.contributes_to_weekly_success()
    ]

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

        # Create lookup of habit entries by habit_id
        entries_by_habit = {entry.habit_id: entry for entry in habit_entries}

        # Build detailed habit status for this day
        habit_statuses = []
        for habit in all_habits:
            entry = entries_by_habit.get(habit.id)
            if entry:
                if entry.is_completed:
                    status = "completed"
                elif entry.is_failed:
                    status = "failed"
                else:
                    status = "recorded"  # Recorded but neither completed nor failed
            else:
                status = "not_recorded"

            habit_statuses.append(
                {
                    "habit_id": habit.id,
                    "habit_title": habit.title,
                    "habit_icon": habit.icon,
                    "status": status,
                    "has_weekly_target": habit.contributes_to_weekly_success(),
                }
            )

        # Count completions by category
        completed_with_targets = sum(
            1
            for entry in habit_entries
            if entry.is_completed
            and any(h.id == entry.habit_id for h in habits_with_targets)
        )
        completed_without_targets = sum(
            1
            for entry in habit_entries
            if entry.is_completed
            and any(h.id == entry.habit_id for h in habits_without_targets)
        )
        total_completed = completed_with_targets + completed_without_targets

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
                "total_habits": len(all_habits),
                "completed_habits": total_completed,
                "completed_with_targets": completed_with_targets,
                "completed_without_targets": completed_without_targets,
                "habit_statuses": habit_statuses,
            }
        )

    # Calculate weekly success based on weekly targets and enhance with habit icons
    weekly_success_achieved = 0
    total_weekly_targets = len(weekly_progress)

    # Add habit icons to weekly progress data
    for habit_id, progress in weekly_progress.items():
        # Find the habit to get its icon
        habit = next((h for h in habits_with_targets if h.id == habit_id), None)
        if habit:
            progress["habit_icon"] = habit.icon

        if progress["current"] >= progress["target"]:
            weekly_success_achieved += 1

    # Determine overall weekly status based on weekly goal achievement
    if total_weekly_targets == 0:
        weekly_status = "no-targets"
        weekly_completion_rate = 1.0  # Perfect if no weekly targets set
    else:
        weekly_completion_rate = weekly_success_achieved / total_weekly_targets
        if weekly_completion_rate >= 1.0:
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
        "week_end": week_end,
        "weekly_progress": weekly_progress,
        "weekly_success_achieved": weekly_success_achieved,
        "total_weekly_targets": total_weekly_targets,
        "weekly_completion_rate": weekly_completion_rate,
        "weekly_status": weekly_status,
        "habits_with_targets": len(habits_with_targets),
        "habits_without_targets": len(habits_without_targets),
    }


async def get_dashboard_data(target_date: date, service: HabitTrackingService) -> dict:
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
