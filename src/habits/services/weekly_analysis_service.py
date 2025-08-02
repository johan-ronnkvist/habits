"""Service for analyzing weekly habit completion patterns and success metrics."""

from datetime import date, timedelta
from typing import Dict, Tuple, DefaultDict, Any, Optional
from collections import defaultdict

from ..repositories.interfaces import DayRepository, UserConfigRepository
from ..utils.logging_config import (
    get_logger,
    log_service_action,
    log_service_completion,
)


class WeeklyStats:
    """Data class containing weekly statistics for habit tracking."""

    def __init__(
        self,
        week_start_date: date,
        week_end_date: date,
        habit_completions: Dict[str, int],
        total_days_in_week: int = 7,
    ):
        self.week_start_date = week_start_date
        self.week_end_date = week_end_date
        self.habit_completions = habit_completions
        self.total_days_in_week = total_days_in_week

    def get_completion_rate_for_habit(self, habit_id: str) -> float:
        """Get completion rate (0.0-1.0) for a specific habit."""
        completions = self.habit_completions.get(habit_id, 0)
        return min(completions / self.total_days_in_week, 1.0)


class WeeklyAnalysisService:
    """Service for analyzing weekly habit performance and determining success."""

    def __init__(self, day_repo: DayRepository, config_repo: UserConfigRepository):
        self.day_repo = day_repo
        self.config_repo = config_repo
        self.logger = get_logger(__name__)

    def get_week_boundaries(
        self, target_date: date, week_start_day: int = 1
    ) -> Tuple[date, date]:
        """Get the start and end dates for the week containing the target date.

        Args:
            target_date: Date within the week
            week_start_day: Day of week when week starts (0=Sunday, 1=Monday, etc.)

        Returns:
            Tuple of (week_start_date, week_end_date)
        """
        days_since_week_start = (target_date.weekday() - week_start_day + 7) % 7
        week_start = target_date - timedelta(days=days_since_week_start)
        week_end = week_start + timedelta(days=6)
        return week_start, week_end

    async def get_weekly_stats(
        self, user_id: str, target_date: date, week_start_day: Optional[int] = None
    ) -> WeeklyStats:
        """Calculate weekly statistics for habit completions by category.

        Args:
            user_id: User identifier
            target_date: Date within the week to analyze
            week_start_day: Day of week when week starts (0=Sunday, 1=Monday, etc.) - if None, uses user's configured setting

        Returns:
            WeeklyStats object containing completion data
        """
        context = log_service_action(
            self.logger,
            "get_weekly_stats",
            user_id=user_id,
            target_date=target_date.isoformat(),
            week_start_day=week_start_day,
        )

        try:
            # Get user configuration first to determine week start day
            user_config = await self.config_repo.get_config(user_id)
            if not user_config:
                log_service_completion(self.logger, context, habits_found=0)
                # Use default week start day if no user config
                effective_week_start_day = (
                    week_start_day if week_start_day is not None else 1
                )
                week_start, week_end = self.get_week_boundaries(
                    target_date, effective_week_start_day
                )
                return WeeklyStats(week_start, week_end, {})

            # Use user's configured week start day if not overridden
            effective_week_start_day = (
                week_start_day
                if week_start_day is not None
                else user_config.week_start_day
            )
            week_start, week_end = self.get_week_boundaries(
                target_date, effective_week_start_day
            )

            # Create mapping of habit_id to habit for weekly tracking
            habits_with_targets = {}
            for habit in user_config.habits:
                if habit.contributes_to_weekly_success():
                    habits_with_targets[habit.id] = habit

            # Get all days in the week
            days_in_week = await self.day_repo.get_days_range(week_start, week_end)

            # Count completions by habit_id for habits with weekly targets
            habit_completions: DefaultDict[str, int] = defaultdict(int)

            for day in days_in_week:
                for entry in day.habit_entries:
                    if entry.habit_id in habits_with_targets and entry.is_completed:
                        habit_completions[entry.habit_id] += 1

            # Use habit completions directly (no category grouping)
            stats = WeeklyStats(week_start, week_end, dict(habit_completions))

            log_service_completion(
                self.logger,
                context,
                week_start=week_start.isoformat(),
                week_end=week_end.isoformat(),
                habits_found=len(habit_completions),
            )

            return stats

        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def is_week_successful(self, user_id: str, target_date: date) -> bool:
        """Determine if a week meets the user's success criteria.

        Args:
            user_id: User identifier
            target_date: Date within the week to check

        Returns:
            True if week meets all configured success criteria, False otherwise
        """
        context = log_service_action(
            self.logger,
            "is_week_successful",
            user_id=user_id,
            target_date=target_date.isoformat(),
        )

        try:
            # Get user configuration
            user_config = await self.config_repo.get_config(user_id)
            if not user_config:
                log_service_completion(
                    self.logger, context, success=True, no_config=True
                )
                return True  # No config means week is always successful

            # Use the user's configured week start day
            week_start_day = user_config.week_start_day

            # If weekly tracking is disabled, week is always successful
            weekly_config = user_config.weekly_success_config
            if weekly_config and not weekly_config.enabled:
                log_service_completion(
                    self.logger, context, success=True, disabled=True
                )
                return True

            # Get week boundaries
            week_start, week_end = self.get_week_boundaries(target_date, week_start_day)

            # Get habits that contribute to weekly success
            habits_with_targets = [
                h for h in user_config.habits if h.contributes_to_weekly_success()
            ]
            if not habits_with_targets:
                log_service_completion(
                    self.logger, context, success=True, no_targets=True
                )
                return True  # No habits with weekly targets means week is always successful

            # Get all days in the week
            days_in_week = await self.day_repo.get_days_range(week_start, week_end)

            # Count completions by habit_id
            habit_completions: DefaultDict[str, int] = defaultdict(int)
            for day in days_in_week:
                for entry in day.habit_entries:
                    if entry.is_completed:
                        habit_completions[entry.habit_id] += 1

            # Check if all habits meet their weekly targets
            habits_met = 0
            total_habits = len(habits_with_targets)

            for habit in habits_with_targets:
                completions = habit_completions.get(habit.id, 0)
                if (
                    habit.weekly_target is not None
                    and completions >= habit.weekly_target
                ):
                    habits_met += 1

            is_successful = habits_met == total_habits

            log_service_completion(
                self.logger,
                context,
                success=True,
                is_successful=is_successful,
                habits_met=habits_met,
                total_habits=total_habits,
            )

            return is_successful

        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_weekly_goal_progress(
        self, user_id: str, target_date: date
    ) -> Dict[str, Dict[str, Any]]:
        """Get progress toward weekly goals for each habit with weekly targets.

        Args:
            user_id: User identifier
            target_date: Date within the week to check

        Returns:
            Dict mapping habit_id -> {"current": int, "target": int, "remaining": int, "habit_title": str}
        """
        context = log_service_action(
            self.logger,
            "get_weekly_goal_progress",
            user_id=user_id,
            target_date=target_date.isoformat(),
        )

        try:
            # Get user configuration
            user_config = await self.config_repo.get_config(user_id)
            progress: Dict[str, Dict[str, Any]] = {}

            if not user_config:
                log_service_completion(self.logger, context, habits=0)
                return progress

            # Get habits with weekly targets
            habits_with_targets = [
                h for h in user_config.habits if h.contributes_to_weekly_success()
            ]
            if not habits_with_targets:
                log_service_completion(self.logger, context, habits=0)
                return progress

            # Use the user's configured week start day
            week_start_day = user_config.week_start_day

            # Get week boundaries
            week_start, week_end = self.get_week_boundaries(target_date, week_start_day)

            # Get all days in the week
            days_in_week = await self.day_repo.get_days_range(week_start, week_end)

            # Count completions by habit_id
            habit_completions: DefaultDict[str, int] = defaultdict(int)
            for day in days_in_week:
                for entry in day.habit_entries:
                    if entry.is_completed:
                        habit_completions[entry.habit_id] += 1

            # Calculate progress for each habit with weekly target
            for habit in habits_with_targets:
                current = habit_completions.get(habit.id, 0)
                target = habit.weekly_target
                if target is not None:
                    remaining = max(0, target - current)

                    progress[habit.id] = {
                        "current": current,
                        "target": target,
                        "remaining": remaining,
                        "habit_title": habit.title,
                    }

            log_service_completion(self.logger, context, habits=len(progress))

            return progress

        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise
