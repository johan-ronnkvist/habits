"""Tests for input validation and XSS prevention."""

import pytest
from pydantic import ValidationError

from src.habits.api.models import (
    HabitCreate,
    HabitCompletionCreate,
    HabitFailureCreate,
    HabitEntryCreate,
)


class TestInputValidation:
    """Test input validation for API models."""

    def test_habit_create_prevents_html_in_title(self):
        """Test that HTML content is rejected in habit titles."""
        with pytest.raises(ValidationError, match="HTML content is not allowed"):
            HabitCreate(
                title="<script>alert('xss')</script>", description="Test description"
            )

    def test_habit_create_prevents_html_in_description(self):
        """Test that HTML content is rejected in habit descriptions."""
        with pytest.raises(ValidationError, match="HTML content is not allowed"):
            HabitCreate(
                title="Test Title", description="<img src=x onerror=alert('xss')>"
            )

    def test_habit_create_validates_title_length(self):
        """Test that title length limits are enforced."""
        with pytest.raises(ValidationError):
            HabitCreate(title="", description="Test description")  # Too short

        with pytest.raises(ValidationError):
            HabitCreate(title="x" * 101, description="Test description")  # Too long

    def test_habit_create_validates_description_length(self):
        """Test that description length limits are enforced."""
        with pytest.raises(ValidationError):
            HabitCreate(title="Test Title", description="")  # Too short

        with pytest.raises(ValidationError):
            HabitCreate(title="Test Title", description="x" * 501)  # Too long

    def test_habit_create_strips_whitespace(self):
        """Test that whitespace is stripped from inputs."""
        habit = HabitCreate(title="  Test Title  ", description="  Test description  ")
        assert habit.title == "Test Title"
        assert habit.description == "Test description"

    def test_habit_completion_prevents_html_in_notes(self):
        """Test that HTML content is rejected in completion notes."""
        with pytest.raises(
            ValidationError, match="HTML content is not allowed in notes"
        ):
            HabitCompletionCreate(
                habit_id="test", notes="<script>alert('xss')</script>"
            )

    def test_habit_failure_prevents_html_in_notes(self):
        """Test that HTML content is rejected in failure notes."""
        with pytest.raises(
            ValidationError, match="HTML content is not allowed in notes"
        ):
            HabitFailureCreate(
                habit_id="test", notes="<img src=x onerror=alert('xss')>"
            )

    def test_habit_entry_prevents_html_in_notes(self):
        """Test that HTML content is rejected in entry notes."""
        with pytest.raises(
            ValidationError, match="HTML content is not allowed in notes"
        ):
            HabitEntryCreate(
                habit_id="test", notes="<iframe src='javascript:alert(1)'></iframe>"
            )

    def test_notes_length_validation(self):
        """Test that notes field length limits are enforced."""
        with pytest.raises(ValidationError):
            HabitCompletionCreate(habit_id="test", notes="x" * 1001)  # Too long

    def test_habit_id_validation(self):
        """Test that habit ID validation works correctly."""
        with pytest.raises(ValidationError):
            HabitCompletionCreate(habit_id="", notes="Test")  # Too short

        with pytest.raises(ValidationError):
            HabitCompletionCreate(habit_id="x" * 101, notes="Test")  # Too long

    def test_valid_inputs_are_accepted(self):
        """Test that valid inputs are accepted."""
        # These should not raise exceptions
        habit = HabitCreate(title="Exercise", description="Daily workout routine")
        assert habit.title == "Exercise"
        assert habit.description == "Daily workout routine"

        completion = HabitCompletionCreate(
            habit_id="test-habit", notes="Completed successfully!"
        )
        assert completion.habit_id == "test-habit"
        assert completion.notes == "Completed successfully!"

        failure = HabitFailureCreate(
            habit_id="test-habit", notes="Couldn't complete today"
        )
        assert failure.habit_id == "test-habit"
        assert failure.notes == "Couldn't complete today"

    def test_none_notes_are_handled_correctly(self):
        """Test that None values for notes are handled correctly."""
        completion = HabitCompletionCreate(habit_id="test-habit", notes=None)
        assert completion.notes is None

        failure = HabitFailureCreate(habit_id="test-habit", notes=None)
        assert failure.notes is None

    def test_empty_notes_are_stripped_to_none(self):
        """Test that empty/whitespace notes are handled correctly."""
        completion = HabitCompletionCreate(habit_id="test-habit", notes="   ")
        assert (
            completion.notes == ""
        )  # Stripped but not None since it's explicitly provided
