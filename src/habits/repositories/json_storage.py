import json
from datetime import date, datetime
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
        self.data_dir = self._validate_data_dir(data_dir)
        self.days_file = self.data_dir / "days.json"
        self.logger = get_logger(__name__)
        self._ensure_data_dir()

        # Simple in-memory cache
        self._cache: Optional[Dict[str, dict]] = None
        self._cache_timestamp: Optional[datetime] = None
        self._cache_ttl_seconds = 60  # Cache for 60 seconds

    def _validate_data_dir(self, data_dir: str | Path) -> Path:
        """Validate and sanitize the data directory path to prevent path traversal."""
        data_path = Path(data_dir).resolve()

        # Get the current working directory as the base
        base_dir = Path.cwd().resolve()

        # Check for dangerous path traversal patterns in the original input
        original_str = str(data_dir)
        if ".." in original_str and not self._is_test_environment():
            raise ValueError(f"Invalid data directory path: {data_path}")

        # For non-test environments, ensure the data directory is within the project directory
        if not self._is_test_environment():
            try:
                data_path.relative_to(base_dir)
            except ValueError:
                raise ValueError(
                    f"Data directory must be within the project directory: {data_path}"
                )

        return data_path

    def _is_test_environment(self) -> bool:
        """Check if we're running in a test environment."""
        import sys

        return (
            "pytest" in sys.modules or "test" in sys.argv[0]
            if sys.argv
            else False or any("test" in arg for arg in sys.argv)
        )

    def _ensure_data_dir(self) -> None:
        """Ensure the data directory exists."""
        self.data_dir.mkdir(exist_ok=True)

    async def _load_days_data(self) -> Dict[str, dict]:
        """Load days data from JSON file with caching."""
        # Check if cache is valid
        if (
            self._cache is not None
            and self._cache_timestamp is not None
            and (datetime.now() - self._cache_timestamp).total_seconds()
            < self._cache_ttl_seconds
        ):
            return self._cache

        # Load from file
        if not self.days_file.exists():
            data = {}
        else:
            with open(self.days_file, "r", encoding="utf-8") as f:
                data = json.load(f)

        # Update cache
        self._cache = data
        self._cache_timestamp = datetime.now()
        return data

    async def _save_days_data(self, data: Dict[str, dict]) -> None:
        """Save days data to JSON file and invalidate cache."""
        with open(self.days_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

        # Invalidate cache after write
        self._cache = None
        self._cache_timestamp = None

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
        self.data_dir = self._validate_data_dir(data_dir)
        self.config_file = self.data_dir / "user_configs.json"
        self.logger = get_logger(__name__)
        self._ensure_data_dir()

        # Simple in-memory cache
        self._cache: Optional[Dict[str, dict]] = None
        self._cache_timestamp: Optional[datetime] = None
        self._cache_ttl_seconds = 60  # Cache for 60 seconds

    def _validate_data_dir(self, data_dir: str | Path) -> Path:
        """Validate and sanitize the data directory path to prevent path traversal."""
        data_path = Path(data_dir).resolve()

        # Get the current working directory as the base
        base_dir = Path.cwd().resolve()

        # Check for dangerous path traversal patterns in the original input
        original_str = str(data_dir)
        if ".." in original_str and not self._is_test_environment():
            raise ValueError(f"Invalid data directory path: {data_path}")

        # For non-test environments, ensure the data directory is within the project directory
        if not self._is_test_environment():
            try:
                data_path.relative_to(base_dir)
            except ValueError:
                raise ValueError(
                    f"Data directory must be within the project directory: {data_path}"
                )

        return data_path

    def _is_test_environment(self) -> bool:
        """Check if we're running in a test environment."""
        import sys

        return (
            "pytest" in sys.modules or "test" in sys.argv[0]
            if sys.argv
            else False or any("test" in arg for arg in sys.argv)
        )

    def _ensure_data_dir(self) -> None:
        """Ensure the data directory exists."""
        self.data_dir.mkdir(exist_ok=True)

    async def _load_configs_data(self) -> Dict[str, dict]:
        """Load user configs data from JSON file with caching."""
        # Check if cache is valid
        if (
            self._cache is not None
            and self._cache_timestamp is not None
            and (datetime.now() - self._cache_timestamp).total_seconds()
            < self._cache_ttl_seconds
        ):
            return self._cache

        # Load from file
        if not self.config_file.exists():
            data = {}
        else:
            with open(self.config_file, "r", encoding="utf-8") as f:
                data = json.load(f)

        # Update cache
        self._cache = data
        self._cache_timestamp = datetime.now()
        return data

    async def _save_configs_data(self, data: Dict[str, dict]) -> None:
        """Save user configs data to JSON file and invalidate cache."""
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

        # Invalidate cache after write
        self._cache = None
        self._cache_timestamp = None

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
