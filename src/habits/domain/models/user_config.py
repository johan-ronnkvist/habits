from typing import List, Optional

from pydantic import BaseModel, Field

from .habit import Habit
from .weekly_config import WeeklySuccessConfig


class UserConfig(BaseModel):
    """Domain model representing user configuration for habit tracking.

    Contains the habits a user wants to track and any other
    user-specific settings.
    """

    habits: List[Habit] = Field(
        default_factory=list, description="List of habits the user wants to track"
    )
    user_id: str = Field(
        ..., min_length=1, description="Unique identifier for the user"
    )
    weekly_success_config: Optional[WeeklySuccessConfig] = Field(
        None, description="Configuration for defining weekly success criteria"
    )
