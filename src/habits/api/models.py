"""Pydantic models for API requests and responses."""

from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class HabitCreate(BaseModel):
    """Request model for creating a new habit."""

    title: str = Field(..., min_length=1, max_length=100, description="Habit title")
    description: str = Field(
        ..., min_length=1, max_length=500, description="Habit description"
    )
    weekly_target: Optional[int] = Field(
        None,
        ge=1,
        le=7,
        description="Number of successful completions needed per week for this habit to contribute to weekly success",
    )

    @field_validator("title", "description")
    @classmethod
    def validate_no_html(cls, v: str) -> str:
        """Prevent HTML content in text fields."""
        if "<" in v or ">" in v:
            raise ValueError("HTML content is not allowed")
        return v.strip()


class HabitUpdate(BaseModel):
    """Request model for updating an existing habit."""

    title: str = Field(..., min_length=1, max_length=100, description="Habit title")
    description: str = Field(
        ..., min_length=1, max_length=500, description="Habit description"
    )
    weekly_target: Optional[int] = Field(
        None,
        ge=1,
        le=7,
        description="Number of successful completions needed per week for this habit to contribute to weekly success",
    )

    @field_validator("title", "description")
    @classmethod
    def validate_no_html(cls, v: str) -> str:
        """Prevent HTML content in text fields."""
        if "<" in v or ">" in v:
            raise ValueError("HTML content is not allowed")
        return v.strip()


class UserSettingsUpdate(BaseModel):
    """Request model for updating user settings."""

    week_start_day: int = Field(
        ...,
        ge=0,
        le=6,
        description="Day of week when week starts (0=Sunday, 1=Monday, 2=Tuesday, etc.)",
    )


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


class WeeklyGoalCreate(BaseModel):
    """Request model for creating a weekly goal."""

    category: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Category name (e.g., 'food', 'workout', 'sleep')",
    )
    minimum_completions: int = Field(
        ...,
        ge=1,
        le=7,
        description="Minimum number of successful completions needed per week",
    )

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        """Validate and normalize category name."""
        if "<" in v or ">" in v:
            raise ValueError("HTML content is not allowed in category")
        return v.strip().lower()


class WeeklyConfigCreate(BaseModel):
    """Request model for creating/updating weekly success configuration."""

    goals: List[WeeklyGoalCreate] = Field(
        default_factory=list,
        description="List of weekly goals that define success criteria",
    )
    week_start_day: int = Field(
        default=1,
        ge=0,
        le=6,
        description="Day of week when week starts (0=Sunday, 1=Monday, etc.)",
    )
    enabled: bool = Field(
        default=True, description="Whether weekly success tracking is enabled"
    )

    @field_validator("goals")
    @classmethod
    def validate_unique_categories(
        cls, v: List[WeeklyGoalCreate]
    ) -> List[WeeklyGoalCreate]:
        """Ensure each category appears only once in goals."""
        categories = [goal.category for goal in v]
        if len(categories) != len(set(categories)):
            raise ValueError("Each category can only have one weekly goal")
        return v
