import tempfile
from datetime import date
from pathlib import Path

import pytest

from src.habits.domain.models.day import Day
from src.habits.domain.models.habit import Habit
from src.habits.domain.models.habit_entry import HabitEntry
from src.habits.domain.models.user_config import UserConfig
from src.habits.repositories.json_storage import (
    JsonDayRepository,
    JsonUserConfigRepository,
)


class TestJsonDayRepository:
    @pytest.fixture
    def temp_dir(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def repository(self, temp_dir):
        return JsonDayRepository(temp_dir)

    @pytest.mark.asyncio
    async def test_save_and_get_day(self, repository):
        test_date = date(2024, 1, 15)
        entry = HabitEntry(habit_id="habit-123", completion_value=5)
        day = Day(date=test_date, habit_entries=[entry])

        await repository.save_day(day)
        retrieved_day = await repository.get_day(test_date)

        assert retrieved_day is not None
        assert retrieved_day.date == test_date
        assert len(retrieved_day.habit_entries) == 1
        assert retrieved_day.habit_entries[0].habit_id == "habit-123"
        assert retrieved_day.habit_entries[0].completion_value == 5

    @pytest.mark.asyncio
    async def test_get_nonexistent_day_returns_none(self, repository):
        test_date = date(2024, 1, 15)
        retrieved_day = await repository.get_day(test_date)

        assert retrieved_day is None

    @pytest.mark.asyncio
    async def test_update_existing_day(self, repository):
        test_date = date(2024, 1, 15)

        # Save initial day
        entry1 = HabitEntry(habit_id="habit-1", completion_value=3)
        day1 = Day(date=test_date, habit_entries=[entry1])
        await repository.save_day(day1)

        # Update with new data
        entry2 = HabitEntry(habit_id="habit-2", completion_value=4)
        day2 = Day(date=test_date, habit_entries=[entry1, entry2])
        await repository.save_day(day2)

        # Verify update
        retrieved_day = await repository.get_day(test_date)
        assert len(retrieved_day.habit_entries) == 2

    @pytest.mark.asyncio
    async def test_get_days_range(self, repository):
        # Save multiple days
        dates = [date(2024, 1, 10), date(2024, 1, 15), date(2024, 1, 20)]
        for test_date in dates:
            entry = HabitEntry(habit_id=f"habit-{test_date.day}", completion_value=1)
            day = Day(date=test_date, habit_entries=[entry])
            await repository.save_day(day)

        # Get range
        days = await repository.get_days_range(date(2024, 1, 12), date(2024, 1, 18))

        assert len(days) == 1
        assert days[0].date == date(2024, 1, 15)

    @pytest.mark.asyncio
    async def test_get_days_range_inclusive(self, repository):
        # Save days at range boundaries
        dates = [date(2024, 1, 10), date(2024, 1, 15), date(2024, 1, 20)]
        for test_date in dates:
            entry = HabitEntry(habit_id=f"habit-{test_date.day}", completion_value=1)
            day = Day(date=test_date, habit_entries=[entry])
            await repository.save_day(day)

        # Get range including boundaries
        days = await repository.get_days_range(date(2024, 1, 10), date(2024, 1, 20))

        assert len(days) == 3
        assert days[0].date == date(2024, 1, 10)
        assert days[1].date == date(2024, 1, 15)
        assert days[2].date == date(2024, 1, 20)

    @pytest.mark.asyncio
    async def test_delete_day(self, repository):
        test_date = date(2024, 1, 15)
        entry = HabitEntry(habit_id="habit-123", completion_value=5)
        day = Day(date=test_date, habit_entries=[entry])

        await repository.save_day(day)

        # Verify day exists
        retrieved_day = await repository.get_day(test_date)
        assert retrieved_day is not None

        # Delete day
        deleted = await repository.delete_day(test_date)
        assert deleted is True

        # Verify day is gone
        retrieved_day = await repository.get_day(test_date)
        assert retrieved_day is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent_day(self, repository):
        test_date = date(2024, 1, 15)
        deleted = await repository.delete_day(test_date)
        assert deleted is False


class TestJsonUserConfigRepository:
    @pytest.fixture
    def temp_dir(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def repository(self, temp_dir):
        return JsonUserConfigRepository(temp_dir)

    @pytest.mark.asyncio
    async def test_save_and_get_config(self, repository):
        habit = Habit(title="Exercise", description="Daily workout")
        config = UserConfig(user_id="user-123", habits=[habit])

        await repository.save_config(config)
        retrieved_config = await repository.get_config("user-123")

        assert retrieved_config is not None
        assert retrieved_config.user_id == "user-123"
        assert len(retrieved_config.habits) == 1
        assert retrieved_config.habits[0].title == "Exercise"

    @pytest.mark.asyncio
    async def test_get_nonexistent_config_returns_none(self, repository):
        retrieved_config = await repository.get_config("nonexistent-user")
        assert retrieved_config is None

    @pytest.mark.asyncio
    async def test_update_existing_config(self, repository):
        # Save initial config
        habit1 = Habit(title="Exercise", description="Daily workout")
        config1 = UserConfig(user_id="user-123", habits=[habit1])
        await repository.save_config(config1)

        # Update config
        habit2 = Habit(title="Read", description="30 minutes reading")
        config2 = UserConfig(user_id="user-123", habits=[habit1, habit2])
        await repository.save_config(config2)

        # Verify update
        retrieved_config = await repository.get_config("user-123")
        assert len(retrieved_config.habits) == 2

    @pytest.mark.asyncio
    async def test_delete_config(self, repository):
        habit = Habit(title="Exercise", description="Daily workout")
        config = UserConfig(user_id="user-123", habits=[habit])

        await repository.save_config(config)

        # Verify config exists
        retrieved_config = await repository.get_config("user-123")
        assert retrieved_config is not None

        # Delete config
        deleted = await repository.delete_config("user-123")
        assert deleted is True

        # Verify config is gone
        retrieved_config = await repository.get_config("user-123")
        assert retrieved_config is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent_config(self, repository):
        deleted = await repository.delete_config("nonexistent-user")
        assert deleted is False
