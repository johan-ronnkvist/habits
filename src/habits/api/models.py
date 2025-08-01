"""Pydantic models for API requests and responses."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class HabitCreate(BaseModel):
    """Request model for creating a new habit."""

    title: str = Field(..., min_length=1, max_length=100, description="Habit title")
    description: str = Field(
        ..., min_length=1, max_length=500, description="Habit description"
    )

    @field_validator("title", "description")
    @classmethod
    def validate_no_html(cls, v: str) -> str:
        """Prevent HTML content in text fields."""
        if "<" in v or ">" in v:
            raise ValueError("HTML content is not allowed")
        return v.strip()


class HabitEntryCreate(BaseModel):
    """Legacy entry creation - DEPRECATED. Use HabitCompletionCreate or HabitFailureCreate."""

    habit_id: str = Field(..., min_length=1, max_length=100)
    completion_value: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=1000, description="Optional notes")

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        """Validate and sanitize notes field."""
        if v is None:
            return v
        if "<" in v or ">" in v:
            raise ValueError("HTML content is not allowed in notes")
        return v.strip() if v else None


class HabitCompletionCreate(BaseModel):
    """Request model for creating a successful habit completion."""

    habit_id: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = Field(
        None, max_length=1000, description="Optional completion notes"
    )

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        """Validate and sanitize notes field."""
        if v is None:
            return v
        if "<" in v or ">" in v:
            raise ValueError("HTML content is not allowed in notes")
        return v.strip() if v else None


class HabitFailureCreate(BaseModel):
    """Request model for creating a failed habit attempt."""

    habit_id: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = Field(
        None, max_length=1000, description="Optional failure notes"
    )

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        """Validate and sanitize notes field."""
        if v is None:
            return v
        if "<" in v or ">" in v:
            raise ValueError("HTML content is not allowed in notes")
        return v.strip() if v else None
