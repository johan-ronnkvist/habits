from pydantic import BaseModel, Field


class Habit(BaseModel):
    """Domain model representing a habit to track.

    A habit is a behavioral pattern that users want to monitor and maintain.
    """

    title: str = Field(..., min_length=1, description="The name of the habit")
    description: str = Field(
        ..., min_length=1, description="A detailed description of the habit"
    )
