"""Date parsing utilities for URL-based navigation."""

from datetime import date


# Month name mappings
MONTH_NAMES = {
    'jan': 1, 'january': 1,
    'feb': 2, 'february': 2,
    'mar': 3, 'march': 3,
    'apr': 4, 'april': 4,
    'may': 5,
    'jun': 6, 'june': 6,
    'jul': 7, 'july': 7,
    'aug': 8, 'august': 8,
    'sep': 9, 'september': 9, 'sept': 9,
    'oct': 10, 'october': 10,
    'nov': 11, 'november': 11,
    'dec': 12, 'december': 12
}


class DateParseError(Exception):
    """Raised when date parsing fails."""
    pass


def parse_url_date(date_path: str) -> date:
    """Parse a date from URL path segments.
    
    Supported formats:
    - 'today' → Today's date
    - 'aug/12' → August 12th of current year
    - 'aug/12/2024' → August 12th, 2024
    - '2024/aug/12' → August 12th, 2024 (alternative)
    - '2024/8/12' → August 12th, 2024 (numeric)
    - '8/12' → August 12th of current year (numeric)
    - '8/12/2024' → August 12th, 2024 (numeric)
    
    Args:
        date_path: URL path segment(s) representing the date
        
    Returns:
        Parsed date object (must not be in the future)
        
    Raises:
        DateParseError: If the date format is invalid, date doesn't exist, or date is in the future
    """
    if not date_path or date_path == 'today':
        return date.today()
    
    # Remove leading/trailing slashes and split
    path_parts = [part.lower().strip() for part in date_path.strip('/').split('/') if part.strip()]
    
    if not path_parts:
        return date.today()
    
    current_year = date.today().year
    
    try:
        if len(path_parts) == 1:
            # Single part - could be special keyword
            part = path_parts[0]
            if part == 'today':
                return date.today()
            else:
                raise DateParseError(f"Unknown date format: {part}")
        
        elif len(path_parts) == 2:
            # Two parts: month/day (assume current year)
            month_part, day_part = path_parts
            month = _parse_month(month_part)
            day = int(day_part)
            parsed_date = date(current_year, month, day)
            _validate_not_future(parsed_date)
            return parsed_date
        
        elif len(path_parts) == 3:
            # Three parts: could be year/month/day or month/day/year
            if _is_year(path_parts[0]):
                # Format: year/month/day
                year = int(path_parts[0])
                month = _parse_month(path_parts[1])
                day = int(path_parts[2])
            elif _is_year(path_parts[2]):
                # Format: month/day/year
                month = _parse_month(path_parts[0])
                day = int(path_parts[1])
                year = int(path_parts[2])
            else:
                raise DateParseError(f"Cannot determine year in: {'/'.join(path_parts)}")
            
            parsed_date = date(year, month, day)
            _validate_not_future(parsed_date)
            return parsed_date
        
        else:
            raise DateParseError(f"Too many path segments: {'/'.join(path_parts)}")
    
    except ValueError as e:
        raise DateParseError(f"Invalid date: {'/'.join(path_parts)} - {e}")
    except Exception as e:
        raise DateParseError(f"Failed to parse date: {'/'.join(path_parts)} - {e}")


def _parse_month(month_str: str) -> int:
    """Parse month from string (name or number).
    
    Args:
        month_str: Month as string (e.g., 'aug', 'august', '8')
        
    Returns:
        Month number (1-12)
        
    Raises:
        ValueError: If month is invalid
    """
    month_str = month_str.lower().strip()
    
    # Try as month name first
    if month_str in MONTH_NAMES:
        return MONTH_NAMES[month_str]
    
    # Try as number
    try:
        month_num = int(month_str)
        if 1 <= month_num <= 12:
            return month_num
        else:
            raise ValueError(f"Month number must be 1-12, got {month_num}")
    except ValueError:
        pass
    
    raise ValueError(f"Invalid month: {month_str}")


def _validate_not_future(target_date: date) -> None:
    """Validate that the target date is not in the future.
    
    Args:
        target_date: Date to validate
        
    Raises:
        DateParseError: If the date is in the future
    """
    today = date.today()
    if target_date > today:
        raise DateParseError(f"Cannot navigate to future date: {target_date.isoformat()} (today is {today.isoformat()})")


def _is_year(year_str: str) -> bool:
    """Check if string represents a plausible year.
    
    Args:
        year_str: String to check
        
    Returns:
        True if it looks like a year (4 digits, reasonable range)
    """
    try:
        year = int(year_str)
        # Accept years from 2000 to 2100 (reasonable range for habit tracking)
        return 2000 <= year <= 2100
    except ValueError:
        return False


def format_date_for_url(target_date: date) -> str:
    """Format a date for use in URLs.
    
    Args:
        target_date: Date to format
        
    Returns:
        URL-friendly date string (e.g., 'aug/12/2024')
    """
    if target_date == date.today():
        return 'today'
    
    # Use abbreviated month name
    month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                   'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    month_name = month_names[target_date.month - 1]
    
    # Only include year if it's not the current year
    if target_date.year == date.today().year:
        return f"{month_name}/{target_date.day}"
    else:
        return f"{month_name}/{target_date.day}/{target_date.year}"


def get_navigation_dates(target_date: date) -> dict:
    """Get previous/next dates for navigation.
    
    Args:
        target_date: Current date
        
    Returns:
        Dictionary with prev_date, next_date, and their URL formats
    """
    from datetime import timedelta
    
    prev_date = target_date - timedelta(days=1)
    next_date = target_date + timedelta(days=1)
    today = date.today()
    
    # Don't allow navigation to future dates
    can_go_next = next_date <= today
    
    return {
        'prev_date': prev_date,
        'next_date': next_date if can_go_next else None,
        'prev_url': format_date_for_url(prev_date),
        'next_url': format_date_for_url(next_date) if can_go_next else None,
        'today_url': 'today',
        'is_today': target_date == today,
        'is_future': target_date > today,
        'can_go_next': can_go_next
    }