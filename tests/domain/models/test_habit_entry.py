from datetime import datetime

import pytest
from pydantic import ValidationError

from src.habits.domain.models.habit_entry import HabitEntry


class TestHabitEntry:
    def test_create_habit_entry_with_minimal_data(self):
        entry = HabitEntry(habit_id="habit-123")

        assert entry.habit_id == "habit-123"
        assert entry.completion_value is None
        assert entry.notes is None
        assert entry.completed_at is None
        assert not entry.is_completed

    def test_create_habit_entry_with_completion_value(self):
        entry = HabitEntry(habit_id="habit-123", completion_value=5)

        assert entry.habit_id == "habit-123"
        assert entry.completion_value == 5
        assert entry.is_completed

    def test_create_habit_entry_with_all_fields(self):
        completed_time = datetime(2024, 1, 15, 10, 30)
        entry = HabitEntry(
            habit_id="habit-123",
            completion_value=3,
            notes="Good workout session",
            completed_at=completed_time,
        )

        assert entry.habit_id == "habit-123"
        assert entry.completion_value == 3
        assert entry.notes == "Good workout session"
        assert entry.completed_at == completed_time
        assert entry.is_completed

    def test_create_habit_entry_without_habit_id_fails(self):
        with pytest.raises(ValidationError):
            HabitEntry()

    def test_create_habit_entry_with_empty_habit_id_fails(self):
        with pytest.raises(ValidationError):
            HabitEntry(habit_id="")

    def test_completion_value_zero_is_completed(self):
        entry = HabitEntry(habit_id="habit-123", completion_value=0)
        assert entry.is_completed

    def test_negative_completion_value_is_incomplete(self):
        entry = HabitEntry(habit_id="habit-123", completion_value=-1)
        assert not entry.is_completed

    def test_habit_entry_serialization(self):
        completed_time = datetime(2024, 1, 15, 10, 30)
        entry = HabitEntry(
            habit_id="habit-123",
            completion_value=4,
            notes="Great session",
            completed_at=completed_time,
        )
        serialized = entry.model_dump()

        assert serialized["habit_id"] == "habit-123"
        assert serialized["completion_value"] == 4
        assert serialized["notes"] == "Great session"
        assert serialized["completed_at"] == completed_time

    def test_habit_entry_deserialization(self):
        data = {
            "habit_id": "habit-456",
            "completion_value": 2,
            "notes": "OK performance",
            "completed_at": "2024-01-15T10:30:00",
        }
        entry = HabitEntry.model_validate(data)

        assert entry.habit_id == "habit-456"
        assert entry.completion_value == 2
        assert entry.notes == "OK performance"
        assert entry.completed_at == datetime(2024, 1, 15, 10, 30)
