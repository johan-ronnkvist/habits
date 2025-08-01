from datetime import date, timedelta
from typing import List, Optional

from ..domain.models.day import Day
from ..domain.models.habit import Habit
from ..domain.models.habit_entry import HabitEntry
from ..domain.models.habit_status import HabitStatus, HabitConstraintError
from ..domain.models.user_config import UserConfig
from ..repositories.interfaces import DayRepository, UserConfigRepository
from ..utils.logging_config import (
    get_logger,
    log_service_action,
    log_service_completion,
)


class HabitTrackingService:
    """Service for managing habit tracking operations."""

    def __init__(self, day_repo: DayRepository, config_repo: UserConfigRepository):
        self.day_repo = day_repo
        self.config_repo = config_repo
        self.logger = get_logger(__name__)

    async def get_or_create_day(self, target_date: date) -> Day:
        """Get an existing day or create a new one if it doesn't exist."""
        context = log_service_action(
            self.logger, "get_or_create_day", target_date=target_date.isoformat()
        )

        try:
            day = await self.day_repo.get_day(target_date)
            if day is None:
                day = Day(date=target_date)
                await self.day_repo.save_day(day)
                log_service_completion(self.logger, context, created_new_day=True)
            else:
                log_service_completion(self.logger, context, created_new_day=False)
            return day
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def record_habit_entry(
        self,
        target_date: date,
        habit_id: str,
        completion_value: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> HabitEntry:
        """Record a habit entry for a specific date."""
        context = log_service_action(
            self.logger,
            "record_habit_entry",
            target_date=target_date.isoformat(),
            habit_id=habit_id,
            completion_value=completion_value,
            has_notes=notes is not None,
        )

        try:
            day = await self.get_or_create_day(target_date)

            # Check if habit already has an entry for this day
            existing_entry = None
            for entry in day.habit_entries:
                if entry.habit_id == habit_id:
                    existing_entry = entry
                    break

            # Remove existing entry if it exists (for replacement)
            if existing_entry:
                day.habit_entries = [
                    entry for entry in day.habit_entries if entry.habit_id != habit_id
                ]
                replaced_existing = True
            else:
                replaced_existing = False

            # Create new entry (preserve legacy behavior)
            entry = HabitEntry(
                habit_id=habit_id, completion_value=completion_value, notes=notes
            )

            day.add_habit_entry(entry)
            await self.day_repo.save_day(day)

            log_service_completion(
                self.logger,
                context,
                replaced_existing=replaced_existing,
                is_completed=entry.is_completed,
                status=entry.status if isinstance(entry.status, str) else entry.status.value if entry.status else None,
                was_already_completed=existing_entry.is_completed if existing_entry else False
            )
            return entry
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def record_habit_completion(
        self,
        target_date: date,
        habit_id: str,
        notes: Optional[str] = None,
    ) -> HabitEntry:
        """Record a successful habit completion.
        
        Args:
            target_date: Date when the habit was completed
            habit_id: ID of the habit that was completed
            notes: Optional notes about the completion
            
        Returns:
            The created HabitEntry with COMPLETED status
            
        Raises:
            HabitConstraintError: If habit is already recorded for this day
        """
        context = log_service_action(
            self.logger,
            "record_habit_completion",
            target_date=target_date.isoformat(),
            habit_id=habit_id,
            has_notes=notes is not None,
        )
        
        try:
            # Check if habit already has an entry for this day
            existing_entry = await self.get_habit_entry(target_date, habit_id)
            if existing_entry:
                status_value = existing_entry.status if isinstance(existing_entry.status, str) else existing_entry.status.value if existing_entry.status else 'unknown'
                error = HabitConstraintError(
                    f"Habit '{habit_id}' already recorded for {target_date.isoformat()} "
                    f"with status: {status_value}"
                )
                log_service_completion(
                    self.logger, context, success=False, error=error,
                    existing_status=existing_entry.status if isinstance(existing_entry.status, str) else existing_entry.status.value if existing_entry.status else None
                )
                raise error
            
            # Create completion entry
            day = await self.get_or_create_day(target_date)
            entry = HabitEntry(
                habit_id=habit_id, status=HabitStatus.COMPLETED, notes=notes
            )
            day.add_habit_entry(entry)
            await self.day_repo.save_day(day)
            
            log_service_completion(
                self.logger, context, status="completed"
            )
            return entry
            
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def record_habit_failure(
        self,
        target_date: date,
        habit_id: str,
        notes: Optional[str] = None,
    ) -> HabitEntry:
        """Record a failed habit attempt.
        
        Args:
            target_date: Date when the habit attempt failed
            habit_id: ID of the habit that failed
            notes: Optional notes about why it failed
            
        Returns:
            The created HabitEntry with FAILED status
            
        Raises:
            HabitConstraintError: If habit is already recorded for this day
        """
        context = log_service_action(
            self.logger,
            "record_habit_failure",
            target_date=target_date.isoformat(),
            habit_id=habit_id,
            has_notes=notes is not None,
        )
        
        try:
            # Check if habit already has an entry for this day
            existing_entry = await self.get_habit_entry(target_date, habit_id)
            if existing_entry:
                status_value = existing_entry.status if isinstance(existing_entry.status, str) else existing_entry.status.value if existing_entry.status else 'unknown'
                error = HabitConstraintError(
                    f"Habit '{habit_id}' already recorded for {target_date.isoformat()} "
                    f"with status: {status_value}"
                )
                log_service_completion(
                    self.logger, context, success=False, error=error,
                    existing_status=existing_entry.status if isinstance(existing_entry.status, str) else existing_entry.status.value if existing_entry.status else None
                )
                raise error
            
            # Create failure entry
            day = await self.get_or_create_day(target_date)
            entry = HabitEntry(
                habit_id=habit_id, status=HabitStatus.FAILED, notes=notes
            )
            day.add_habit_entry(entry)
            await self.day_repo.save_day(day)
            
            log_service_completion(
                self.logger, context, status="failed"
            )
            return entry
            
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def complete_habit_if_not_already(
        self,
        target_date: date,
        habit_id: str,
        completion_value: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> tuple[HabitEntry, bool]:
        """Complete a habit only if it's not already completed.
        
        DEPRECATED: Use record_habit_completion() for new code.
        This method maintains backward compatibility.
        
        Returns:
            tuple: (entry, was_already_completed)
            - entry: The habit entry (existing or new)
            - was_already_completed: True if habit was already completed
        """
        context = log_service_action(
            self.logger,
            "complete_habit_if_not_already",
            target_date=target_date.isoformat(),
            habit_id=habit_id,
            completion_value=completion_value,
            has_notes=notes is not None,
        )
        
        try:
            # Check if habit is already completed (not just any entry)
            existing_entry = await self.get_habit_entry(target_date, habit_id)
            
            if existing_entry and existing_entry.is_completed:
                # Already completed, return existing entry
                log_service_completion(
                    self.logger,
                    context,
                    was_already_completed=True,
                    existing_status=existing_entry.status if isinstance(existing_entry.status, str) else existing_entry.status.value if existing_entry.status else None
                )
                return existing_entry, True
            
            # Not completed yet (either no entry or failed entry), record completion
            entry = await self.record_habit_entry(target_date, habit_id, completion_value, notes)
            log_service_completion(
                self.logger,
                context,
                was_already_completed=False,
                new_completion_value=completion_value
            )
            return entry, False
            
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_habit_entry(
        self, target_date: date, habit_id: str
    ) -> Optional[HabitEntry]:
        """Get the habit entry for a specific date and habit, if it exists."""
        context = log_service_action(
            self.logger,
            "get_habit_entry",
            target_date=target_date.isoformat(),
            habit_id=habit_id,
        )

        try:
            day = await self.day_repo.get_day(target_date)
            if day is None:
                log_service_completion(
                    self.logger, context, found=False, reason="no_day_data"
                )
                return None

            for entry in day.habit_entries:
                if entry.habit_id == habit_id:
                    log_service_completion(self.logger, context, found=True)
                    return entry

            log_service_completion(
                self.logger, context, found=False, reason="no_habit_entry"
            )
            return None
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_habit_progress(self, start_date: date, end_date: date) -> List[Day]:
        """Get habit progress for a date range."""
        context = log_service_action(
            self.logger,
            "get_habit_progress",
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            date_range_days=(end_date - start_date).days + 1,
        )

        try:
            days = await self.day_repo.get_days_range(start_date, end_date)
            log_service_completion(self.logger, context, days_retrieved=len(days))
            return days
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_habit_streak(
        self, habit_id: str, end_date: date, max_days: int = 365
    ) -> int:
        """Calculate the current streak for a specific habit."""
        context = log_service_action(
            self.logger,
            "get_habit_streak",
            habit_id=habit_id,
            end_date=end_date.isoformat(),
            max_days=max_days,
        )

        try:
            streak = 0
            current_date = end_date
            days_checked = 0

            for _ in range(max_days):
                day = await self.day_repo.get_day(current_date)
                days_checked += 1

                if day is None:
                    break

                # Check if habit was completed on this day
                habit_completed = any(
                    entry.habit_id == habit_id and entry.is_completed
                    for entry in day.habit_entries
                )

                if habit_completed:
                    streak += 1
                    current_date = current_date - timedelta(days=1)
                else:
                    break

            log_service_completion(
                self.logger, context, streak_length=streak, days_checked=days_checked
            )
            return streak
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_user_habits(self, user_id: str) -> List[Habit]:
        """Get all habits configured for a user."""
        context = log_service_action(self.logger, "get_user_habits", user_id=user_id)

        try:
            config = await self.config_repo.get_config(user_id)
            habits = config.habits if config else []
            
            # Log habit IDs for debugging ID consistency issues
            habit_ids = [habit.id for habit in habits] if habits else []
            log_service_completion(
                self.logger, context, habits_count=len(habits), habit_ids=habit_ids
            )
            return habits
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def add_habit_to_user(self, user_id: str, habit: Habit) -> UserConfig:
        """Add a new habit to a user's configuration."""
        context = log_service_action(
            self.logger,
            "add_habit_to_user",
            user_id=user_id,
            habit_title=habit.title,
            habit_id=habit.id,
        )

        try:
            config = await self.config_repo.get_config(user_id)
            created_new_config = config is None

            if config is None:
                config = UserConfig(user_id=user_id, habits=[])

            # Check if habit already exists (by title)
            existing_titles = {h.title for h in config.habits}
            habit_added = habit.title not in existing_titles

            if habit_added:
                config.habits.append(habit)
                await self.config_repo.save_config(config)

            log_service_completion(
                self.logger,
                context,
                created_new_config=created_new_config,
                habit_added=habit_added,
                total_habits=len(config.habits),
            )
            return config
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def remove_habit_from_user(self, user_id: str, habit_title: str) -> bool:
        """Remove a habit from a user's configuration."""
        context = log_service_action(
            self.logger,
            "remove_habit_from_user",
            user_id=user_id,
            habit_title=habit_title,
        )

        try:
            config = await self.config_repo.get_config(user_id)
            if config is None:
                log_service_completion(
                    self.logger, context, removed=False, reason="no_config"
                )
                return False

            original_count = len(config.habits)
            config.habits = [h for h in config.habits if h.title != habit_title]
            removed = len(config.habits) < original_count

            if removed:
                await self.config_repo.save_config(config)

            log_service_completion(
                self.logger,
                context,
                removed=removed,
                habits_before=original_count,
                habits_after=len(config.habits),
            )
            return removed
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_daily_summary(self, target_date: date) -> Optional[dict]:
        """Get a summary of habit completion for a specific day."""
        context = log_service_action(
            self.logger, "get_daily_summary", target_date=target_date.isoformat()
        )

        try:
            day = await self.day_repo.get_day(target_date)
            if day is None:
                log_service_completion(
                    self.logger, context, has_summary=False, reason="no_day_data"
                )
                return None

            summary = {
                "date": target_date,
                "total_habits": day.get_total_habits_count(),
                "completed_habits": day.get_completed_habits_count(),
                "completion_rate": day.get_completion_rate(),
                "completion_value_counts": day.get_completion_value_counts(),
            }

            log_service_completion(
                self.logger,
                context,
                has_summary=True,
                total_habits=summary["total_habits"],
                completed_habits=summary["completed_habits"],
                completion_rate=summary["completion_rate"],
            )
            return summary
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise
