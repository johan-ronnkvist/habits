"""Pydantic models for API requests and responses."""

from typing import Optional
from pydantic import BaseModel


class HabitCreate(BaseModel):
    """Request model for creating a new habit."""
    title: str
    description: str


class HabitEntryCreate(BaseModel):
    """Legacy entry creation - DEPRECATED. Use HabitCompletionCreate or HabitFailureCreate."""
    habit_id: str
    completion_value: Optional[int] = None
    notes: Optional[str] = None


class HabitCompletionCreate(BaseModel):
    """Request model for creating a successful habit completion."""
    habit_id: str
    notes: Optional[str] = None


class HabitFailureCreate(BaseModel):
    """Request model for creating a failed habit attempt."""
    habit_id: str
    notes: Optional[str] = None