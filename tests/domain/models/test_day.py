from datetime import date

import pytest
from pydantic import ValidationError

from src.habits.domain.models.day import Day
from src.habits.domain.models.habit_entry import HabitEntry


class TestDay:
    def test_create_day_with_minimal_data(self):
        test_date = date(2024, 1, 15)
        day = Day(date=test_date)

        assert day.date == test_date
        assert day.habit_entries == []
        assert day.get_total_habits_count() == 0
        assert day.get_completed_habits_count() == 0
        assert day.get_completion_rate() == 0.0

    def test_create_day_without_date_fails(self):
        with pytest.raises(ValidationError):
            Day()

    def test_add_habit_entry(self):
        test_date = date(2024, 1, 15)
        day = Day(date=test_date)
        entry = HabitEntry(habit_id="habit-123", completion_value=5)

        day.add_habit_entry(entry)

        assert len(day.habit_entries) == 1
        assert day.habit_entries[0] == entry
        assert day.get_total_habits_count() == 1
        assert day.get_completed_habits_count() == 1

    def test_multiple_habit_entries(self):
        test_date = date(2024, 1, 15)
        day = Day(date=test_date)

        entry1 = HabitEntry(habit_id="habit-1", completion_value=3)
        entry2 = HabitEntry(habit_id="habit-2", completion_value=None)
        entry3 = HabitEntry(habit_id="habit-3", completion_value=5)

        day.add_habit_entry(entry1)
        day.add_habit_entry(entry2)
        day.add_habit_entry(entry3)

        assert day.get_total_habits_count() == 3
        assert day.get_completed_habits_count() == 2  # entry2 is not completed

    def test_completion_rate_calculation(self):
        test_date = date(2024, 1, 15)
        day = Day(date=test_date)

        # 3 completed out of 4 total = 0.75
        day.add_habit_entry(HabitEntry(habit_id="habit-1", completion_value=1))
        day.add_habit_entry(HabitEntry(habit_id="habit-2", completion_value=2))
        day.add_habit_entry(HabitEntry(habit_id="habit-3", completion_value=None))
        day.add_habit_entry(HabitEntry(habit_id="habit-4", completion_value=0))

        assert day.get_completion_rate() == 0.75

    def test_completion_rate_with_no_entries(self):
        test_date = date(2024, 1, 15)
        day = Day(date=test_date)

        assert day.get_completion_rate() == 0.0

    def test_get_completion_value_counts(self):
        test_date = date(2024, 1, 15)
        day = Day(date=test_date)

        day.add_habit_entry(HabitEntry(habit_id="habit-1", completion_value=5))
        day.add_habit_entry(HabitEntry(habit_id="habit-2", completion_value=3))
        day.add_habit_entry(HabitEntry(habit_id="habit-3", completion_value=5))
        day.add_habit_entry(HabitEntry(habit_id="habit-4", completion_value=None))
        day.add_habit_entry(HabitEntry(habit_id="habit-5", completion_value=3))

        counts = day.get_completion_value_counts()

        assert counts[5] == 2
        assert counts[3] == 2
        assert counts[None] == 1

    def test_day_serialization(self):
        test_date = date(2024, 1, 15)
        day = Day(date=test_date)
        entry = HabitEntry(habit_id="habit-123", completion_value=4)
        day.add_habit_entry(entry)

        serialized = day.model_dump()

        assert serialized["date"] == test_date
        assert len(serialized["habit_entries"]) == 1
        assert serialized["habit_entries"][0]["habit_id"] == "habit-123"
        assert serialized["habit_entries"][0]["completion_value"] == 4

    def test_day_deserialization(self):
        data = {
            "date": "2024-01-15",
            "habit_entries": [
                {
                    "habit_id": "habit-123",
                    "completion_value": 3,
                    "notes": "Good job",
                    "completed_at": "2024-01-15T10:30:00",
                }
            ],
        }
        day = Day.model_validate(data)

        assert day.date == date(2024, 1, 15)
        assert len(day.habit_entries) == 1
        assert day.habit_entries[0].habit_id == "habit-123"
        assert day.habit_entries[0].completion_value == 3
