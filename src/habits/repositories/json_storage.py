import json
from datetime import date
from pathlib import Path
from typing import Dict, List, Optional

from ..domain.models.day import Day
from ..domain.models.user_config import UserConfig
from ..utils.logging_config import (
    get_logger,
    log_service_action,
    log_service_completion,
)
from .interfaces import DayRepository, UserConfigRepository


class JsonDayRepository(DayRepository):
    """JSON file-based implementation of DayRepository."""

    def __init__(self, data_dir: str | Path = "data"):
        self.data_dir = Path(data_dir)
        self.days_file = self.data_dir / "days.json"
        self.logger = get_logger(__name__)
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
        context = log_service_action(
            self.logger,
            "save_day",
            date=day.date.isoformat(),
            habit_entries_count=len(day.habit_entries),
        )

        try:
            data = await self._load_days_data()
            date_key = day.date.isoformat()
            was_update = date_key in data
            data[date_key] = day.model_dump()
            await self._save_days_data(data)

            log_service_completion(self.logger, context, was_update=was_update)
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_day(self, target_date: date) -> Optional[Day]:
        """Get a day record by date."""
        context = log_service_action(
            self.logger, "get_day", date=target_date.isoformat()
        )

        try:
            data = await self._load_days_data()
            date_key = target_date.isoformat()

            if date_key not in data:
                log_service_completion(self.logger, context, found=False)
                return None

            day = Day.model_validate(data[date_key])
            log_service_completion(
                self.logger,
                context,
                found=True,
                habit_entries_count=len(day.habit_entries),
            )
            return day
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_days_range(self, start_date: date, end_date: date) -> List[Day]:
        """Get all days within a date range (inclusive)."""
        context = log_service_action(
            self.logger,
            "get_days_range",
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            date_range_days=(end_date - start_date).days + 1,
        )

        try:
            data = await self._load_days_data()
            days = []

            for date_key, day_data in data.items():
                day_date = date.fromisoformat(date_key)
                if start_date <= day_date <= end_date:
                    days.append(Day.model_validate(day_data))

            # Sort by date
            days.sort(key=lambda d: d.date)

            log_service_completion(
                self.logger,
                context,
                days_found=len(days),
                total_days_in_storage=len(data),
            )
            return days
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def delete_day(self, target_date: date) -> bool:
        """Delete a day record. Returns True if deleted, False if not found."""
        context = log_service_action(
            self.logger, "delete_day", date=target_date.isoformat()
        )

        try:
            data = await self._load_days_data()
            date_key = target_date.isoformat()

            if date_key in data:
                del data[date_key]
                await self._save_days_data(data)
                log_service_completion(self.logger, context, deleted=True)
                return True

            log_service_completion(self.logger, context, deleted=False)
            return False
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise


class JsonUserConfigRepository(UserConfigRepository):
    """JSON file-based implementation of UserConfigRepository."""

    def __init__(self, data_dir: str | Path = "data"):
        self.data_dir = Path(data_dir)
        self.config_file = self.data_dir / "user_configs.json"
        self.logger = get_logger(__name__)
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
        context = log_service_action(
            self.logger,
            "save_config",
            user_id=config.user_id,
            habits_count=len(config.habits),
        )

        try:
            data = await self._load_configs_data()
            was_update = config.user_id in data
            data[config.user_id] = config.model_dump()
            await self._save_configs_data(data)

            log_service_completion(self.logger, context, was_update=was_update)
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def get_config(self, user_id: str) -> Optional[UserConfig]:
        """Get user configuration by user ID."""
        context = log_service_action(self.logger, "get_config", user_id=user_id)

        try:
            data = await self._load_configs_data()

            if user_id not in data:
                log_service_completion(self.logger, context, found=False)
                return None

            config = UserConfig.model_validate(data[user_id])
            log_service_completion(
                self.logger, context, found=True, habits_count=len(config.habits)
            )
            return config
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise

    async def delete_config(self, user_id: str) -> bool:
        """Delete user configuration. Returns True if deleted, False if not found."""
        context = log_service_action(self.logger, "delete_config", user_id=user_id)

        try:
            data = await self._load_configs_data()

            if user_id in data:
                del data[user_id]
                await self._save_configs_data(data)
                log_service_completion(self.logger, context, deleted=True)
                return True

            log_service_completion(self.logger, context, deleted=False)
            return False
        except Exception as e:
            log_service_completion(self.logger, context, success=False, error=e)
            raise
