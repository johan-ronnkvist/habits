"""Domain-specific exceptions for the habits application."""


class HabitsError(Exception):
    """Base exception class for all habits domain errors."""

    pass


class HabitAlreadyCompletedException(HabitsError):
    """Raised when trying to complete a habit that's already completed for the day."""

    def __init__(self, habit_id: str, date: str, existing_completion_value: int):
        self.habit_id = habit_id
        self.date = date
        self.existing_completion_value = existing_completion_value
        super().__init__(
            f"Habit '{habit_id}' is already completed for {date} "
            f"(completion value: {existing_completion_value})"
        )


class InvalidHabitEntryException(HabitsError):
    """Raised when trying to create an invalid habit entry."""

    pass
