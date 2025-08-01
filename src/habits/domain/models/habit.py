import uuid
from pydantic import BaseModel, Field, field_validator


class Habit(BaseModel):
    """Domain model representing a habit to track.

    A habit is a behavioral pattern that users want to monitor and maintain.
    """

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique identifier for the habit",
    )
    
    @field_validator('id')
    @classmethod
    def validate_id(cls, v: str) -> str:
        """Ensure ID is always a valid non-empty string."""
        if not v or not isinstance(v, str):
            return str(uuid.uuid4())
        return v
    title: str = Field(..., min_length=1, description="The name of the habit")
    description: str = Field(
        ..., min_length=1, description="A detailed description of the habit"
    )
