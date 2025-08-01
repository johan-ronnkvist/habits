"""Habit status enumeration and constraints."""

from enum import Enum
from typing import Optional


class HabitStatus(Enum):
    """Explicit status for habit completion."""
    
    COMPLETED = "completed"
    FAILED = "failed"
    # NOT_RECORDED is implicit - no entry exists
    
    @classmethod
    def from_completion_value(cls, completion_value: Optional[int]) -> Optional["HabitStatus"]:
        """Convert legacy completion_value to HabitStatus.
        
        Args:
            completion_value: Legacy completion value
            
        Returns:
            HabitStatus or None if not recorded
        """
        if completion_value is None:
            return None  # NOT_RECORDED (no entry)
        elif completion_value >= 0:
            return cls.COMPLETED
        else:
            return cls.FAILED
    
    def to_completion_value(self) -> int:
        """Convert HabitStatus to legacy completion_value for backward compatibility.
        
        Returns:
            Integer value compatible with existing logic
        """
        if self == HabitStatus.COMPLETED:
            return 1  # Default completed value
        elif self == HabitStatus.FAILED:  
            return -1  # Failed indicator
        else:
            raise ValueError(f"Cannot convert {self} to completion_value")


class HabitConstraintError(Exception):
    """Raised when habit status constraints are violated."""
    pass