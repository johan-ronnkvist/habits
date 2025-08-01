import pytest
from pydantic import ValidationError

from src.habits.domain.models.habit import Habit


class TestHabit:
    def test_create_habit_with_valid_data(self):
        habit = Habit(title="Exercise", description="Daily workout routine")

        assert habit.title == "Exercise"
        assert habit.description == "Daily workout routine"
        assert habit.id is not None
        assert len(habit.id) > 0

    def test_create_habit_with_empty_title_fails(self):
        with pytest.raises(ValidationError):
            Habit(title="", description="Some description")

    def test_create_habit_with_empty_description_fails(self):
        with pytest.raises(ValidationError):
            Habit(title="Exercise", description="")

    def test_create_habit_without_title_fails(self):
        with pytest.raises(ValidationError):
            Habit(description="Some description")

    def test_create_habit_without_description_fails(self):
        with pytest.raises(ValidationError):
            Habit(title="Exercise")

    def test_habit_serialization(self):
        habit = Habit(title="Read", description="Read for 30 minutes")
        serialized = habit.model_dump()

        assert serialized["title"] == "Read"
        assert serialized["description"] == "Read for 30 minutes"
        assert "id" in serialized
        assert len(serialized["id"]) > 0

    def test_habit_deserialization(self):
        data = {"title": "Meditate", "description": "10 minutes of meditation"}
        habit = Habit.model_validate(data)

        assert habit.title == "Meditate"
        assert habit.description == "10 minutes of meditation"
        assert habit.id is not None  # Should get auto-generated ID
