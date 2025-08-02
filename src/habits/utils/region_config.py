"""Utilities for region-based configuration defaults."""

import locale
import logging
from typing import Dict

logger = logging.getLogger(__name__)


# Countries that typically start the week on Sunday
SUNDAY_START_REGIONS = {
    "US",  # United States
    "CA",  # Canada
    "MX",  # Mexico
    "BR",  # Brazil
    "JM",  # Jamaica
    "IL",  # Israel
    "JP",  # Japan
    "KR",  # South Korea
    "TH",  # Thailand
    "TW",  # Taiwan
    "PH",  # Philippines
    "SA",  # Saudi Arabia
    "AE",  # UAE
    "IN",  # India
    "PK",  # Pakistan
    "BD",  # Bangladesh
    "ZA",  # South Africa
    "AU",  # Australia
    "NZ",  # New Zealand
}

# Most other countries start the week on Monday (ISO 8601 standard)
# This includes EU countries, UK, Russia, China, etc.


def get_region_code_from_locale() -> str:
    """Get the region code from the current locale.

    Returns:
        Two-letter country code or empty string if not detected
    """
    try:
        # Get the current locale
        current_locale = locale.getlocale()[0]
        if not current_locale:
            # Try to get default locale
            current_locale = locale.getdefaultlocale()[0]

        if current_locale and "_" in current_locale:
            # Extract country code from locale like "en_US" -> "US"
            return current_locale.split("_")[-1].upper()

        logger.debug(f"Could not extract region from locale: {current_locale}")
        return ""

    except Exception as e:
        logger.debug(f"Error detecting locale: {e}")
        return ""


def get_default_week_start_day() -> int:
    """Get the default week start day based on the user's region.

    Returns:
        0 for Sunday, 1 for Monday (ISO 8601 weekday numbering)
    """
    region_code = get_region_code_from_locale()

    if region_code in SUNDAY_START_REGIONS:
        logger.debug(f"Region {region_code} uses Sunday as week start")
        return 0  # Sunday
    else:
        logger.debug(
            f"Region {region_code or 'unknown'} uses Monday as week start (ISO 8601)"
        )
        return 1  # Monday (ISO 8601 default)


def get_week_start_day_display_name(day: int) -> str:
    """Get display name for week start day.

    Args:
        day: 0 for Sunday, 1 for Monday

    Returns:
        Display name for the day
    """
    return "Sunday" if day == 0 else "Monday"


def get_available_week_start_options() -> Dict[int, str]:
    """Get available week start day options.

    Returns:
        Dictionary mapping day number to display name
    """
    return {1: "Monday (ISO 8601 standard)", 0: "Sunday (US/Canada style)"}
