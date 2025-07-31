from datetime import date, timedelta
from unittest.mock import AsyncMock

import pytest

from src.habits.domain.models.day import Day
from src.habits.domain.models.habit import Habit
from src.habits.domain.models.habit_entry import HabitEntry
from src.habits.domain.models.user_config import UserConfig
from src.habits.services.habit_tracking_service import HabitTrackingService


class TestHabitTrackingService:
    @pytest.fixture
    def mock_day_repo(self):
        return AsyncMock()

    @pytest.fixture
    def mock_config_repo(self):
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_day_repo, mock_config_repo):
        return HabitTrackingService(mock_day_repo, mock_config_repo)

    @pytest.mark.asyncio
    async def test_get_or_create_day_existing(self, service, mock_day_repo):
        test_date = date(2024, 1, 15)
        existing_day = Day(date=test_date)
        mock_day_repo.get_day.return_value = existing_day

        result = await service.get_or_create_day(test_date)

        assert result == existing_day
        mock_day_repo.get_day.assert_called_once_with(test_date)
        mock_day_repo.save_day.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_or_create_day_new(self, service, mock_day_repo):
        test_date = date(2024, 1, 15)
        mock_day_repo.get_day.return_value = None

        result = await service.get_or_create_day(test_date)

        assert result.date == test_date
        assert result.habit_entries == []
        mock_day_repo.get_day.assert_called_once_with(test_date)
        mock_day_repo.save_day.assert_called_once()

    @pytest.mark.asyncio
    async def test_record_habit_entry_new_day(self, service, mock_day_repo):
        test_date = date(2024, 1, 15)
        mock_day_repo.get_day.return_value = None

        entry = await service.record_habit_entry(
            test_date, "habit-123", completion_value=5, notes="Great job"
        )

        assert entry.habit_id == "habit-123"
        assert entry.completion_value == 5
        assert entry.notes == "Great job"
        mock_day_repo.save_day.assert_called()

    @pytest.mark.asyncio
    async def test_record_habit_entry_existing_day(self, service, mock_day_repo):
        test_date = date(2024, 1, 15)
        existing_day = Day(date=test_date)
        mock_day_repo.get_day.return_value = existing_day

        entry = await service.record_habit_entry(
            test_date, "habit-123", completion_value=3
        )

        assert entry.habit_id == "habit-123"
        assert entry.completion_value == 3
        assert len(existing_day.habit_entries) == 1

    @pytest.mark.asyncio
    async def test_record_habit_entry_replaces_existing(self, service, mock_day_repo):
        test_date = date(2024, 1, 15)
        old_entry = HabitEntry(habit_id="habit-123", completion_value=2)
        existing_day = Day(date=test_date, habit_entries=[old_entry])
        mock_day_repo.get_day.return_value = existing_day

        await service.record_habit_entry(
            test_date, "habit-123", completion_value=5
        )

        assert len(existing_day.habit_entries) == 1
        assert existing_day.habit_entries[0].completion_value == 5
        assert existing_day.habit_entries[0] != old_entry

    @pytest.mark.asyncio
    async def test_get_habit_streak_no_days(self, service, mock_day_repo):
        end_date = date(2024, 1, 15)
        mock_day_repo.get_day.return_value = None
        
        streak = await service.get_habit_streak("habit-123", end_date)
        
        assert streak == 0
        mock_day_repo.get_day.assert_called_once_with(end_date)
    
    @pytest.mark.asyncio
    async def test_get_habit_streak_single_day(self, service, mock_day_repo):
        end_date = date(2024, 1, 15)
        entry = HabitEntry(habit_id="habit-123", completion_value=5)
        day = Day(date=end_date, habit_entries=[entry])
        
        def mock_get_day(target_date):
            if target_date == end_date:
                return day
            return None
        
        mock_day_repo.get_day.side_effect = mock_get_day
        
        streak = await service.get_habit_streak("habit-123", end_date)
        
        assert streak == 1
    
    @pytest.mark.asyncio
    async def test_get_habit_streak_multiple_consecutive_days(self, service, mock_day_repo):
        end_date = date(2024, 1, 15)
        
        # Create 3 consecutive days with completed habits
        days_data = {}
        for i in range(3):
            target_date = end_date - timedelta(days=i)
            entry = HabitEntry(habit_id="habit-123", completion_value=5)
            day = Day(date=target_date, habit_entries=[entry])
            days_data[target_date] = day
        
        def mock_get_day(target_date):
            return days_data.get(target_date)
        
        mock_day_repo.get_day.side_effect = mock_get_day
        
        streak = await service.get_habit_streak("habit-123", end_date)
        
        assert streak == 3
    
    @pytest.mark.asyncio
    async def test_get_habit_streak_broken_streak(self, service, mock_day_repo):
        end_date = date(2024, 1, 15)
        
        # Day 1 (end_date): completed
        # Day 2: not completed  
        # Day 3: completed (but shouldn't count due to break)
        days_data = {}
        
        # End date - completed
        entry1 = HabitEntry(habit_id="habit-123", completion_value=5)
        day1 = Day(date=end_date, habit_entries=[entry1])
        days_data[end_date] = day1
        
        # Previous day - not completed
        prev_date = end_date - timedelta(days=1)
        entry2 = HabitEntry(habit_id="habit-123", completion_value=None)
        day2 = Day(date=prev_date, habit_entries=[entry2])
        days_data[prev_date] = day2
        
        def mock_get_day(target_date):
            return days_data.get(target_date)
        
        mock_day_repo.get_day.side_effect = mock_get_day
        
        streak = await service.get_habit_streak("habit-123", end_date)
        
        assert streak == 1  # Only the end date counts
    
    @pytest.mark.asyncio
    async def test_get_habit_streak_different_habit_id(self, service, mock_day_repo):
        end_date = date(2024, 1, 15)
        
        # Day has a different habit completed
        entry = HabitEntry(habit_id="different-habit", completion_value=5)
        day = Day(date=end_date, habit_entries=[entry])
        
        def mock_get_day(target_date):
            if target_date == end_date:
                return day
            return None
        
        mock_day_repo.get_day.side_effect = mock_get_day
        
        streak = await service.get_habit_streak("habit-123", end_date)
        
        assert streak == 0
    
    @pytest.mark.asyncio
    async def test_get_habit_streak_mixed_completion_values(self, service, mock_day_repo):
        end_date = date(2024, 1, 15)
        
        days_data = {}
        for i, completion_value in enumerate([5, 0, None, 3]):  # 0 is completed, None is not
            target_date = end_date - timedelta(days=i)
            entry = HabitEntry(habit_id="habit-123", completion_value=completion_value)
            day = Day(date=target_date, habit_entries=[entry])
            days_data[target_date] = day
        
        def mock_get_day(target_date):
            return days_data.get(target_date)
        
        mock_day_repo.get_day.side_effect = mock_get_day
        
        streak = await service.get_habit_streak("habit-123", end_date)
        
        assert streak == 2  # First two days (5 and 0 are both completed)
    
    @pytest.mark.asyncio
    async def test_get_habit_streak_max_days_limit(self, service, mock_day_repo):
        end_date = date(2024, 1, 15)
        
        # Mock to always return a day with completed habit
        entry = HabitEntry(habit_id="habit-123", completion_value=5)
        day = Day(date=end_date, habit_entries=[entry])
        mock_day_repo.get_day.return_value = day
        
        # Test with max_days=3
        streak = await service.get_habit_streak("habit-123", end_date, max_days=3)
        
        assert streak == 3
        assert mock_day_repo.get_day.call_count == 3
    
    @pytest.mark.asyncio
    async def test_get_habit_streak_cross_month_boundary(self, service, mock_day_repo):
        # Test crossing month boundary (Jan 1, 2024 to Dec 31, 2023)
        end_date = date(2024, 1, 1)
        
        days_data = {}
        # Jan 1, 2024 and Dec 31, 2023
        for i in range(2):
            target_date = end_date - timedelta(days=i)
            entry = HabitEntry(habit_id="habit-123", completion_value=5)
            day = Day(date=target_date, habit_entries=[entry])
            days_data[target_date] = day
        
        def mock_get_day(target_date):
            return days_data.get(target_date)
        
        mock_day_repo.get_day.side_effect = mock_get_day
        
        streak = await service.get_habit_streak("habit-123", end_date)
        
        assert streak == 2
        # Verify it called for Jan 1, 2024 and Dec 31, 2023 (and then Dec 30 which returns None)
        expected_calls = [
            date(2024, 1, 1),
            date(2023, 12, 31),
            date(2023, 12, 30)  # This will return None and break the streak
        ]
        actual_calls = [call[0][0] for call in mock_day_repo.get_day.call_args_list]
        assert actual_calls == expected_calls

    @pytest.mark.asyncio
    async def test_get_habit_progress(self, service, mock_day_repo):
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)
        expected_days = [Day(date=date(2024, 1, 1)), Day(date=date(2024, 1, 2))]
        mock_day_repo.get_days_range.return_value = expected_days

        result = await service.get_habit_progress(start_date, end_date)

        assert result == expected_days
        mock_day_repo.get_days_range.assert_called_once_with(start_date, end_date)

    @pytest.mark.asyncio
    async def test_get_user_habits_existing_config(self, service, mock_config_repo):
        habit1 = Habit(title="Exercise", description="Daily workout")
        habit2 = Habit(title="Read", description="30 minutes reading")
        config = UserConfig(user_id="user-123", habits=[habit1, habit2])
        mock_config_repo.get_config.return_value = config

        result = await service.get_user_habits("user-123")

        assert len(result) == 2
        assert result[0].title == "Exercise"
        assert result[1].title == "Read"

    @pytest.mark.asyncio
    async def test_get_user_habits_no_config(self, service, mock_config_repo):
        mock_config_repo.get_config.return_value = None

        result = await service.get_user_habits("user-123")

        assert result == []

    @pytest.mark.asyncio
    async def test_add_habit_to_user_new_config(self, service, mock_config_repo):
        mock_config_repo.get_config.return_value = None
        habit = Habit(title="Exercise", description="Daily workout")

        result = await service.add_habit_to_user("user-123", habit)

        assert result.user_id == "user-123"
        assert len(result.habits) == 1
        assert result.habits[0].title == "Exercise"
        mock_config_repo.save_config.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_habit_to_user_existing_config(self, service, mock_config_repo):
        existing_habit = Habit(title="Read", description="30 minutes reading")
        config = UserConfig(user_id="user-123", habits=[existing_habit])
        mock_config_repo.get_config.return_value = config

        new_habit = Habit(title="Exercise", description="Daily workout")
        result = await service.add_habit_to_user("user-123", new_habit)

        assert len(result.habits) == 2
        assert any(h.title == "Read" for h in result.habits)
        assert any(h.title == "Exercise" for h in result.habits)

    @pytest.mark.asyncio
    async def test_add_habit_to_user_duplicate_title(self, service, mock_config_repo):
        existing_habit = Habit(title="Exercise", description="Old description")
        config = UserConfig(user_id="user-123", habits=[existing_habit])
        mock_config_repo.get_config.return_value = config

        duplicate_habit = Habit(title="Exercise", description="New description")
        result = await service.add_habit_to_user("user-123", duplicate_habit)

        assert len(result.habits) == 1
        assert result.habits[0].description == "Old description"

    @pytest.mark.asyncio
    async def test_remove_habit_from_user_success(self, service, mock_config_repo):
        habit1 = Habit(title="Exercise", description="Daily workout")
        habit2 = Habit(title="Read", description="30 minutes reading")
        config = UserConfig(user_id="user-123", habits=[habit1, habit2])
        mock_config_repo.get_config.return_value = config

        result = await service.remove_habit_from_user("user-123", "Exercise")

        assert result is True
        mock_config_repo.save_config.assert_called_once()
        saved_config = mock_config_repo.save_config.call_args[0][0]
        assert len(saved_config.habits) == 1
        assert saved_config.habits[0].title == "Read"

    @pytest.mark.asyncio
    async def test_remove_habit_from_user_not_found(self, service, mock_config_repo):
        habit = Habit(title="Exercise", description="Daily workout")
        config = UserConfig(user_id="user-123", habits=[habit])
        mock_config_repo.get_config.return_value = config

        result = await service.remove_habit_from_user("user-123", "Nonexistent")

        assert result is False
        mock_config_repo.save_config.assert_not_called()

    @pytest.mark.asyncio
    async def test_remove_habit_from_user_no_config(self, service, mock_config_repo):
        mock_config_repo.get_config.return_value = None

        result = await service.remove_habit_from_user("user-123", "Exercise")

        assert result is False
        mock_config_repo.save_config.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_daily_summary_existing_day(self, service, mock_day_repo):
        test_date = date(2024, 1, 15)
        entry1 = HabitEntry(habit_id="habit-1", completion_value=5)
        entry2 = HabitEntry(habit_id="habit-2", completion_value=None)
        day = Day(date=test_date, habit_entries=[entry1, entry2])
        mock_day_repo.get_day.return_value = day

        result = await service.get_daily_summary(test_date)

        assert result is not None
        assert result["date"] == test_date
        assert result["total_habits"] == 2
        assert result["completed_habits"] == 1
        assert result["completion_rate"] == 0.5

    @pytest.mark.asyncio
    async def test_get_daily_summary_no_day(self, service, mock_day_repo):
        test_date = date(2024, 1, 15)
        mock_day_repo.get_day.return_value = None

        result = await service.get_daily_summary(test_date)

        assert result is None
