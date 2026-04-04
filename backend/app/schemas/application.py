from datetime import datetime

from pydantic import BaseModel, Field


class ApplicationCreate(BaseModel):
    job_id: int
    score: int = 0
    notes: str | None = None
    skills: list[str] = Field(default_factory=list)
    experience_years: int = 0
    avatar: str | None = None
    role: str | None = None
    location: str | None = None
    phone: str | None = None
    cgpa: float | None = None
    resume_url: str | None = None


class ApplicationStatusUpdate(BaseModel):
    status: str
    assigned_to: int | None = None
    notes: str | None = None


class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    job_id: int
    candidate_name: str
    candidate_email: str
    status: str
    score: int
    assigned_to: int | None
    notes: str | None
    skills: list[str]
    experience_years: int
    avatar: str | None
    role: str | None
    location: str | None
    phone: str | None
    cgpa: float | None
    resume_url: str | None
    status_history: list[dict]
    applied_at: datetime

    class Config:
        from_attributes = True