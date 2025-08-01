from datetime import date as DateType
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from .habit_entry import HabitEntry


class Day(BaseModel):
    """Domain model representing a single day with tracked habits.

    A day contains multiple habit entries, allowing users to track
    their progress on various habits for a specific date.
    """

    date: DateType = Field(..., description="The date this day represents")
    habit_entries: List[HabitEntry] = Field(
        default_factory=list, description="List of habit entries for this day"
    )

    def add_habit_entry(self, habit_entry: HabitEntry) -> None:
        """Add a habit entry to this day."""
        self.habit_entries.append(habit_entry)

    def get_completed_habits_count(self) -> int:
        """Get the number of completed habits for this day."""
        return sum(1 for entry in self.habit_entries if entry.is_completed)

    def get_total_habits_count(self) -> int:
        """Get the total number of habit entries for this day."""
        return len(self.habit_entries)

    def get_completion_value_counts(self) -> Dict[Optional[int], int]:
        """Get a count of habit entries by completion value."""
        counts: Dict[Optional[int], int] = {}
        for entry in self.habit_entries:
            value = entry.completion_value
            counts[value] = counts.get(value, 0) + 1
        return counts

    def get_completion_rate(self) -> float:
        """Get the completion rate as a percentage (0.0 to 1.0)."""
        total = self.get_total_habits_count()
        if total == 0:
            return 0.0
        completed = self.get_completed_habits_count()
        return completed / total
