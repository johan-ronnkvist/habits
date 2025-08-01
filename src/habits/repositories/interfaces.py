from abc import ABC, abstractmethod
from datetime import date
from typing import List, Optional

from ..domain.models.day import Day
from ..domain.models.user_config import UserConfig


class DayRepository(ABC):
    """Abstract repository interface for Day entities."""

    @abstractmethod
    async def save_day(self, day: Day) -> None:
        """Save a day record."""
        pass

    @abstractmethod
    async def get_day(self, target_date: date) -> Optional[Day]:
        """Get a day record by date."""
        pass

    @abstractmethod
    async def get_days_range(self, start_date: date, end_date: date) -> List[Day]:
        """Get all days within a date range (inclusive)."""
        pass

    @abstractmethod
    async def delete_day(self, target_date: date) -> bool:
        """Delete a day record. Returns True if deleted, False if not found."""
        pass


class UserConfigRepository(ABC):
    """Abstract repository interface for UserConfig entities."""

    @abstractmethod
    async def save_config(self, config: UserConfig) -> None:
        """Save user configuration."""
        pass

    @abstractmethod
    async def get_config(self, user_id: str) -> Optional[UserConfig]:
        """Get user configuration by user ID."""
        pass

    @abstractmethod
    async def delete_config(self, user_id: str) -> bool:
        """Delete user configuration. Returns True if deleted, False if not found."""
        pass
