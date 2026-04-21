"""Pydantic schemas for alerts and notifications."""

from datetime import datetime

from pydantic import BaseModel


class AlertCreate(BaseModel):
    """Payload for creating a new job alert."""

    role_keywords: list[str]
    location: str | None = None
    min_salary: int | None = None
    max_experience: int | None = None


class AlertResponse(BaseModel):
    """API response for alert records."""

    id: int
    candidate_id: int
    role_keywords: list[str]
    location: str | None
    min_salary: int | None
    max_experience: int | None
    is_active: bool
    created_at: datetime
    last_triggered_at: datetime | None

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    """API response for notification records."""

    id: int
    user_id: int
    type: str
    title: str
    body: str
    job_id: int | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Paginated notification list response."""

    items: list[NotificationResponse]
    total_count: int
    unread_count: int


class AlertOptionsResponse(BaseModel):
    """Options for alert creation dropdowns sourced from existing jobs."""

    role_keywords: list[str]
    locations: list[str]
    min_salary_options: list[int]
    max_experience_options: list[int]
