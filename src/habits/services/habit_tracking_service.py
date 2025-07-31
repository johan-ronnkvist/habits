from datetime import date, timedelta
from typing import List, Optional

from ..domain.models.day import Day
from ..domain.models.habit import Habit
from ..domain.models.habit_entry import HabitEntry
from ..domain.models.user_config import UserConfig
from ..repositories.interfaces import DayRepository, UserConfigRepository


class HabitTrackingService:
    """Service for managing habit tracking operations."""

    def __init__(self, day_repo: DayRepository, config_repo: UserConfigRepository):
        self.day_repo = day_repo
        self.config_repo = config_repo

    async def get_or_create_day(self, target_date: date) -> Day:
        """Get an existing day or create a new one if it doesn't exist."""
        day = await self.day_repo.get_day(target_date)
        if day is None:
            day = Day(date=target_date)
            await self.day_repo.save_day(day)
        return day

    async def record_habit_entry(
        self,
        target_date: date,
        habit_id: str,
        completion_value: Optional[int] = None,
        notes: Optional[str] = None,
    ) -> HabitEntry:
        """Record a habit entry for a specific date."""
        day = await self.get_or_create_day(target_date)

        # Remove existing entry for this habit if it exists
        day.habit_entries = [
            entry for entry in day.habit_entries if entry.habit_id != habit_id
        ]

        # Create new entry
        entry = HabitEntry(
            habit_id=habit_id, completion_value=completion_value, notes=notes
        )

        day.add_habit_entry(entry)
        await self.day_repo.save_day(day)

        return entry

    async def get_habit_progress(self, start_date: date, end_date: date) -> List[Day]:
        """Get habit progress for a date range."""
        return await self.day_repo.get_days_range(start_date, end_date)

    async def get_habit_streak(
        self, habit_id: str, end_date: date, max_days: int = 365
    ) -> int:
        """Calculate the current streak for a specific habit."""
        streak = 0
        current_date = end_date

        for _ in range(max_days):
            day = await self.day_repo.get_day(current_date)
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

        return streak

    async def get_user_habits(self, user_id: str) -> List[Habit]:
        """Get all habits configured for a user."""
        config = await self.config_repo.get_config(user_id)
        return config.habits if config else []

    async def add_habit_to_user(self, user_id: str, habit: Habit) -> UserConfig:
        """Add a new habit to a user's configuration."""
        config = await self.config_repo.get_config(user_id)
        if config is None:
            config = UserConfig(user_id=user_id, habits=[])

        # Check if habit already exists (by title)
        existing_titles = {h.title for h in config.habits}
        if habit.title not in existing_titles:
            config.habits.append(habit)
            await self.config_repo.save_config(config)

        return config

    async def remove_habit_from_user(self, user_id: str, habit_title: str) -> bool:
        """Remove a habit from a user's configuration."""
        config = await self.config_repo.get_config(user_id)
        if config is None:
            return False

        original_count = len(config.habits)
        config.habits = [h for h in config.habits if h.title != habit_title]

        if len(config.habits) < original_count:
            await self.config_repo.save_config(config)
            return True

        return False

    async def get_daily_summary(self, target_date: date) -> Optional[dict]:
        """Get a summary of habit completion for a specific day."""
        day = await self.day_repo.get_day(target_date)
        if day is None:
            return None

        return {
            "date": target_date,
            "total_habits": day.get_total_habits_count(),
            "completed_habits": day.get_completed_habits_count(),
            "completion_rate": day.get_completion_rate(),
            "completion_value_counts": day.get_completion_value_counts(),
        }
