import json
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional

from ..domain.models.day import Day
from ..domain.models.user_config import UserConfig
from .interfaces import DayRepository, UserConfigRepository


class JsonDayRepository(DayRepository):
    """JSON file-based implementation of DayRepository."""

    def __init__(self, data_dir: Path = Path("data")):
        self.data_dir = data_dir
        self.days_file = data_dir / "days.json"
        self._ensure_data_dir()

    def _ensure_data_dir(self) -> None:
        """Ensure the data directory exists."""
        self.data_dir.mkdir(exist_ok=True)

    async def _load_days_data(self) -> Dict[str, dict]:
        """Load days data from JSON file."""
        if not self.days_file.exists():
            return {}

        with open(self.days_file, "r", encoding="utf-8") as f:
            return json.load(f)

    async def _save_days_data(self, data: Dict[str, dict]) -> None:
        """Save days data to JSON file."""
        with open(self.days_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    async def save_day(self, day: Day) -> None:
        """Save a day record."""
        data = await self._load_days_data()
        date_key = day.date.isoformat()
        data[date_key] = day.model_dump()
        await self._save_days_data(data)

    async def get_day(self, target_date: date) -> Optional[Day]:
        """Get a day record by date."""
        data = await self._load_days_data()
        date_key = target_date.isoformat()

        if date_key not in data:
            return None

        return Day.model_validate(data[date_key])

    async def get_days_range(self, start_date: date, end_date: date) -> List[Day]:
        """Get all days within a date range (inclusive)."""
        data = await self._load_days_data()
        days = []

        for date_key, day_data in data.items():
            day_date = date.fromisoformat(date_key)
            if start_date <= day_date <= end_date:
                days.append(Day.model_validate(day_data))

        # Sort by date
        days.sort(key=lambda d: d.date)
        return days

    async def delete_day(self, target_date: date) -> bool:
        """Delete a day record. Returns True if deleted, False if not found."""
        data = await self._load_days_data()
        date_key = target_date.isoformat()

        if date_key in data:
            del data[date_key]
            await self._save_days_data(data)
            return True

        return False


class JsonUserConfigRepository(UserConfigRepository):
    """JSON file-based implementation of UserConfigRepository."""

    def __init__(self, data_dir: Path = Path("data")):
        self.data_dir = data_dir
        self.config_file = data_dir / "user_configs.json"
        self._ensure_data_dir()

    def _ensure_data_dir(self) -> None:
        """Ensure the data directory exists."""
        self.data_dir.mkdir(exist_ok=True)

    async def _load_configs_data(self) -> Dict[str, dict]:
        """Load user configs data from JSON file."""
        if not self.config_file.exists():
            return {}

        with open(self.config_file, "r", encoding="utf-8") as f:
            return json.load(f)

    async def _save_configs_data(self, data: Dict[str, dict]) -> None:
        """Save user configs data to JSON file."""
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    async def save_config(self, config: UserConfig) -> None:
        """Save user configuration."""
        data = await self._load_configs_data()
        data[config.user_id] = config.model_dump()
        await self._save_configs_data(data)

    async def get_config(self, user_id: str) -> Optional[UserConfig]:
        """Get user configuration by user ID."""
        data = await self._load_configs_data()

        if user_id not in data:
            return None

        return UserConfig.model_validate(data[user_id])

    async def delete_config(self, user_id: str) -> bool:
        """Delete user configuration. Returns True if deleted, False if not found."""
        data = await self._load_configs_data()

        if user_id in data:
            del data[user_id]
            await self._save_configs_data(data)
            return True

        return False
