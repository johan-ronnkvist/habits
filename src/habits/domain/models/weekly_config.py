"""Domain models for weekly success configuration."""

from typing import List
from pydantic import BaseModel, Field, field_validator


class WeeklyGoal(BaseModel):
    """Represents a weekly goal for a specific habit category.

    For example: "Complete at least 6 food habits per week" or
    "Complete at least 3 workout habits per week".
    """

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
        return v.strip().lower()


class WeeklySuccessConfig(BaseModel):
    """Configuration defining what constitutes a successful week for a user.

    Contains multiple weekly goals that must all be met for a week to be
    considered successful.
    """

    user_id: str = Field(
        ..., min_length=1, description="Unique identifier for the user"
    )
    goals: List[WeeklyGoal] = Field(
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
    def validate_unique_categories(cls, v: List[WeeklyGoal]) -> List[WeeklyGoal]:
        """Ensure each category appears only once in goals."""
        categories = [goal.category for goal in v]
        if len(categories) != len(set(categories)):
            raise ValueError("Each category can only have one weekly goal")
        return v

    def get_goal_for_category(self, category: str) -> WeeklyGoal | None:
        """Get the weekly goal for a specific category."""
        category_normalized = category.strip().lower()
        for goal in self.goals:
            if goal.category == category_normalized:
                return goal
        return None

    def has_goal_for_category(self, category: str) -> bool:
        """Check if there's a weekly goal configured for the given category."""
        return self.get_goal_for_category(category) is not None
