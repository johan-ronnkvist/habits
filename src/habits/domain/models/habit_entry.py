from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class HabitEntry(BaseModel):
    """Domain model representing a tracked instance of a habit.

    A habit entry captures when a habit was performed, with an optional
    completion value and notes. The meaning of the completion value is
    managed by the application context.
    """

    habit_id: str = Field(
        ..., min_length=1, description="Reference to the habit being tracked"
    )
    completion_value: Optional[int] = Field(
        default=None,
        description="Optional integer representing completion level/quality",
    )
    notes: Optional[str] = Field(
        default=None, description="Optional notes about this habit entry"
    )
    completed_at: Optional[datetime] = Field(
        default=None, description="When the habit entry was recorded"
    )

    @property
    def is_completed(self) -> bool:
        """Check if the habit has a completion value (not None)."""
        return self.completion_value is not None
