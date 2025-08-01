from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field
from .habit_status import HabitStatus


class HabitEntry(BaseModel):
    """Domain model representing a tracked instance of a habit.

    A habit entry captures when a habit was performed with an explicit status:
    - COMPLETED: Successfully completed the habit
    - FAILED: Attempted but failed to complete the habit

    The completion_value field is maintained for backward compatibility
    but the status field is the authoritative source of truth.
    """

    habit_id: str = Field(
        ..., min_length=1, description="Reference to the habit being tracked"
    )
    completion_value: Optional[int] = Field(
        default=None,
        description="Completion value. Positive=completed, negative=failed, None=not recorded.",
    )
    status: Optional[HabitStatus] = Field(
        default=None,
        description="Explicit status: COMPLETED or FAILED. Auto-derived from completion_value if not provided.",
    )
    notes: Optional[str] = Field(
        default=None, description="Optional notes about this habit entry"
    )
    completed_at: Optional[datetime] = Field(
        default=None, description="When the habit entry was recorded"
    )

    def __init__(self, **data):
        """Initialize with status-completion_value sync."""
        # If only status is provided, derive completion_value
        if "status" in data and "completion_value" not in data:
            status = data["status"]
            if isinstance(status, str):
                status = HabitStatus(status)
            if status:
                data["completion_value"] = status.to_completion_value()

        # If only completion_value is provided, derive status
        elif "completion_value" in data and "status" not in data:
            completion_value = data["completion_value"]
            if completion_value is not None:
                data["status"] = HabitStatus.from_completion_value(completion_value)

        super().__init__(**data)

    @property
    def is_completed(self) -> bool:
        """Check if the habit was completed successfully.

        Uses completion_value as primary source, status as secondary.
        """
        if self.completion_value is not None:
            return self.completion_value >= 0
        if self.status:
            if isinstance(self.status, str):
                return self.status == HabitStatus.COMPLETED.value
            return self.status == HabitStatus.COMPLETED
        return False

    @property
    def is_failed(self) -> bool:
        """Check if the habit attempt failed."""
        if self.completion_value is not None:
            return self.completion_value < 0
        if self.status:
            if isinstance(self.status, str):
                return self.status == HabitStatus.FAILED.value
            return self.status == HabitStatus.FAILED
        return False

    class Config:
        """Pydantic configuration."""

        use_enum_values = True  # Serialize enums as their values, not repr
