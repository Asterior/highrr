"""Centralized HTTP error helpers.
All route files import from here instead of raising HTTPException directly.
Ensures consistent error shape across the entire API:
{"detail": "human readable message"}
"""

from fastapi import HTTPException, status


def not_found(resource: str) -> None:
    """Raises 404 for a missing resource."""
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} not found")


def forbidden(reason: str = "Access denied") -> None:
    """Raises 403 with an optional reason."""
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=reason)


def bad_request(reason: str) -> None:
    """Raises 400 with the provided reason."""
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)


def unauthorized() -> None:
    """Raises 401 for missing or invalid authentication."""
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")


def conflict(reason: str) -> None:
    """Raises 409 with the provided reason."""
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=reason)


def unprocessable(reason: str) -> None:
    """Raises 422 with the provided reason."""
    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=reason)


def service_unavailable(reason: str) -> None:
    """Raises 503 with the provided reason."""
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=reason)
