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
    async def test_record_habit_entry_replaces_incomplete_entry(
        self, service, mock_day_repo
    ):
        """Should allow replacing an incomplete entry (-1) with a completed one."""
        test_date = date(2024, 1, 15)
        old_entry = HabitEntry(habit_id="habit-123", completion_value=-1)  # Incomplete
        existing_day = Day(date=test_date, habit_entries=[old_entry])
        mock_day_repo.get_day.return_value = existing_day

        await service.record_habit_entry(test_date, "habit-123", completion_value=5)

        assert len(existing_day.habit_entries) == 1
        assert existing_day.habit_entries[0].completion_value == 5
        assert existing_day.habit_entries[0] != old_entry

    @pytest.mark.asyncio
    async def test_complete_habit_if_not_already_prevents_multiple_completions(
        self, service, mock_day_repo
    ):
        """Should prevent completing a habit that's already completed using safe method."""
        test_date = date(2024, 1, 15)
        completed_entry = HabitEntry(
            habit_id="habit-123", completion_value=3
        )  # Already completed
        existing_day = Day(date=test_date, habit_entries=[completed_entry])
        mock_day_repo.get_day.return_value = existing_day

        # Using the safe completion method should return existing entry
        entry, was_already_completed = await service.complete_habit_if_not_already(
            test_date, "habit-123", completion_value=5
        )

        # Should return existing entry and indicate it was already completed
        assert was_already_completed is True
        assert entry.completion_value == 3  # Original value preserved
        assert len(existing_day.habit_entries) == 1
        assert existing_day.habit_entries[0].completion_value == 3

    @pytest.mark.asyncio
    async def test_complete_habit_if_not_already_allows_completing_from_incomplete(
        self, service, mock_day_repo
    ):
        """Should allow completing a habit that was previously marked incomplete."""
        test_date = date(2024, 1, 15)
        incomplete_entry = HabitEntry(
            habit_id="habit-123", completion_value=-1
        )  # Incomplete
        existing_day = Day(date=test_date, habit_entries=[incomplete_entry])
        mock_day_repo.get_day.return_value = existing_day

        # This should work - completing from incomplete state
        entry, was_already_completed = await service.complete_habit_if_not_already(
            test_date, "habit-123", completion_value=4
        )

        assert was_already_completed is False  # Was not previously completed
        assert entry.completion_value == 4
        assert entry.is_completed
        assert len(existing_day.habit_entries) == 1
        assert existing_day.habit_entries[0].completion_value == 4

    @pytest.mark.asyncio
    async def test_record_habit_entry_allows_marking_complete_as_incomplete(
        self, service, mock_day_repo
    ):
        """Should allow marking a completed habit as incomplete (for corrections)."""
        test_date = date(2024, 1, 15)
        completed_entry = HabitEntry(
            habit_id="habit-123", completion_value=3
        )  # Completed
        existing_day = Day(date=test_date, habit_entries=[completed_entry])
        mock_day_repo.get_day.return_value = existing_day

        # This should work - marking as incomplete for correction
        entry = await service.record_habit_entry(
            test_date, "habit-123", completion_value=-1
        )

        assert entry.completion_value == -1
        assert not entry.is_completed
        assert len(existing_day.habit_entries) == 1
        assert existing_day.habit_entries[0].completion_value == -1

    @pytest.mark.asyncio
    async def test_complete_habit_if_not_already_with_no_existing_entry(
        self, service, mock_day_repo
    ):
        """Should complete a habit when no existing entry exists."""
        test_date = date(2024, 1, 15)
        existing_day = Day(date=test_date, habit_entries=[])  # No existing entries
        mock_day_repo.get_day.return_value = existing_day

        # This should work - no existing entry
        entry, was_already_completed = await service.complete_habit_if_not_already(
            test_date, "habit-123", completion_value=5, notes="First completion"
        )

        assert was_already_completed is False
        assert entry.completion_value == 5
        assert entry.is_completed
        assert entry.notes == "First completion"
        assert len(existing_day.habit_entries) == 1

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
    async def test_get_habit_streak_multiple_consecutive_days(
        self, service, mock_day_repo
    ):
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
    async def test_get_habit_streak_mixed_completion_values(
        self, service, mock_day_repo
    ):
        end_date = date(2024, 1, 15)

        days_data = {}
        for i, completion_value in enumerate(
            [5, 0, None, 3]
        ):  # 0 is completed, None is not
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
            date(2023, 12, 30),  # This will return None and break the streak
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

    @pytest.mark.asyncio
    async def test_habit_can_only_be_completed_once_per_day(
        self, service, mock_day_repo
    ):
        """Test that a habit can only have one entry per day, but can be updated."""
        target_date = date(2024, 1, 1)
        habit_id = "habit-123"

        # Mock initial empty day
        initial_day = Day(date=target_date)
        mock_day_repo.get_day.return_value = initial_day

        # First completion
        entry1 = await service.record_habit_entry(
            target_date, habit_id, 1, "First attempt"
        )

        assert entry1.habit_id == habit_id
        assert entry1.completion_value == 1
        assert entry1.notes == "First attempt"
        assert len(initial_day.habit_entries) == 1

        # Second completion should replace the first
        entry2 = await service.record_habit_entry(
            target_date, habit_id, 2, "Updated entry"
        )

        assert entry2.habit_id == habit_id
        assert entry2.completion_value == 2
        assert entry2.notes == "Updated entry"
        # Should still only have one entry for this habit
        assert len(initial_day.habit_entries) == 1
        # The entry should be the updated one
        assert initial_day.habit_entries[0].completion_value == 2
        assert initial_day.habit_entries[0].notes == "Updated entry"

    @pytest.mark.asyncio
    async def test_multiple_habits_same_day(self, service, mock_day_repo):
        """Test that multiple different habits can be completed on the same day."""
        target_date = date(2024, 1, 1)
        habit_id_1 = "habit-123"
        habit_id_2 = "habit-456"

        # Mock initial empty day
        initial_day = Day(date=target_date)
        mock_day_repo.get_day.return_value = initial_day

        # Complete first habit
        await service.record_habit_entry(target_date, habit_id_1, 1, "Habit 1")

        # Complete second habit
        await service.record_habit_entry(target_date, habit_id_2, 2, "Habit 2")

        # Should have two entries
        assert len(initial_day.habit_entries) == 2

        # Verify both entries exist
        habit_ids = [entry.habit_id for entry in initial_day.habit_entries]
        assert habit_id_1 in habit_ids
        assert habit_id_2 in habit_ids

    @pytest.mark.asyncio
    async def test_update_habit_completion_same_day(self, service, mock_day_repo):
        """Test that updating a habit entry on the same day replaces the previous entry."""
        target_date = date(2024, 1, 1)
        habit_id = "habit-123"

        # Mock day with existing entry
        existing_entry = HabitEntry(
            habit_id=habit_id, completion_value=1, notes="Original"
        )
        existing_day = Day(date=target_date, habit_entries=[existing_entry])
        mock_day_repo.get_day.return_value = existing_day

        # Update the entry
        updated_entry = await service.record_habit_entry(
            target_date, habit_id, 5, "Updated notes"
        )

        # Should still have only one entry
        assert len(existing_day.habit_entries) == 1
        # Entry should be updated
        assert existing_day.habit_entries[0].completion_value == 5
        assert existing_day.habit_entries[0].notes == "Updated notes"
        assert updated_entry.completion_value == 5
        assert updated_entry.notes == "Updated notes"

    @pytest.mark.asyncio
    async def test_habit_completion_different_days(self, service, mock_day_repo):
        """Test that the same habit can be completed on different days."""
        habit_id = "habit-123"
        date1 = date(2024, 1, 1)
        date2 = date(2024, 1, 2)

        # Mock different days
        day1 = Day(date=date1)
        day2 = Day(date=date2)

        def mock_get_day(target_date):
            if target_date == date1:
                return day1
            elif target_date == date2:
                return day2
            return None

        mock_day_repo.get_day.side_effect = mock_get_day

        # Complete habit on day 1
        await service.record_habit_entry(date1, habit_id, 1, "Day 1")

        # Complete habit on day 2
        await service.record_habit_entry(date2, habit_id, 2, "Day 2")

        # Each day should have one entry
        assert len(day1.habit_entries) == 1
        assert len(day2.habit_entries) == 1
        assert day1.habit_entries[0].completion_value == 1
        assert day2.habit_entries[0].completion_value == 2

    @pytest.mark.asyncio
    async def test_habit_entry_with_zero_and_negative_values(
        self, service, mock_day_repo
    ):
        """Test that habit entries can be recorded with zero and negative values (incomplete)."""
        target_date = date(2024, 1, 1)
        habit_id = "habit-123"

        # Mock initial empty day
        initial_day = Day(date=target_date)
        mock_day_repo.get_day.return_value = initial_day

        # Record with zero value (should be considered complete)
        entry1 = await service.record_habit_entry(
            target_date, habit_id, 0, "Zero value"
        )
        assert entry1.is_completed

        # Update with negative value (should be considered incomplete)
        entry2 = await service.record_habit_entry(
            target_date, habit_id, -1, "Negative value"
        )
        assert not entry2.is_completed
        assert len(initial_day.habit_entries) == 1  # Still only one entry per day

    @pytest.mark.asyncio
    async def test_get_habit_entry(self, service, mock_day_repo):
        """Test retrieving a specific habit entry for a date."""
        target_date = date(2024, 1, 1)
        habit_id = "habit-123"

        # Test with no day data
        mock_day_repo.get_day.return_value = None
        result = await service.get_habit_entry(target_date, habit_id)
        assert result is None

        # Test with day but no matching habit
        other_entry = HabitEntry(habit_id="other-habit", completion_value=1)
        day_with_other = Day(date=target_date, habit_entries=[other_entry])
        mock_day_repo.get_day.return_value = day_with_other
        result = await service.get_habit_entry(target_date, habit_id)
        assert result is None

        # Test with matching habit entry
        target_entry = HabitEntry(
            habit_id=habit_id, completion_value=5, notes="Test note"
        )
        day_with_target = Day(
            date=target_date, habit_entries=[other_entry, target_entry]
        )
        mock_day_repo.get_day.return_value = day_with_target
        result = await service.get_habit_entry(target_date, habit_id)
        assert result is not None
        assert result.habit_id == habit_id
        assert result.completion_value == 5
        assert result.notes == "Test note"
