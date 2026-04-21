"""Input sanitization helpers.
Call these on any user-supplied string before storing to database.
"""

import re


def sanitize_string(value: str, max_length: int = 500) -> str:
    """Strips whitespace, removes null bytes, and truncates to max length."""
    return (value or "").replace("\x00", "").strip()[:max_length]


def sanitize_url(value: str) -> str:
    """Validates URL format and allows only http:// or https:// schemes."""
    cleaned = sanitize_string(value, max_length=1000)
    if not (cleaned.startswith("http://") or cleaned.startswith("https://")):
        raise ValueError("URL must start with http:// or https://")
    return cleaned


def sanitize_filename(value: str) -> str:
    """Removes unsafe characters and path separators from file names."""
    normalized = sanitize_string(value, max_length=255).replace("/", "").replace("\\", "")
    safe = re.sub(r"[^A-Za-z0-9._-]", "", normalized)
    if not safe:
        raise ValueError("Filename is invalid")
    return safe
