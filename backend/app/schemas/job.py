from datetime import datetime

from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    title: str
    description: str
    location: str | None = None
    salary: str | None = None
    job_type: str
    required_skills: list[str] = Field(default_factory=list)
    experience_required: str | None = None
    application_count: int = 0
    department: str | None = None
    status: str = "Active"
    is_active: bool = True
    application_deadline: datetime


class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    salary: str | None = None
    job_type: str | None = None
    required_skills: list[str] | None = None
    experience_required: str | None = None
    application_count: int | None = None
    department: str | None = None
    status: str | None = None
    is_active: bool | None = None
    application_deadline: datetime | None = None


class JobResponse(BaseModel):
    id: int
    title: str
    description: str
    location: str | None
    salary: str | None
    job_type: str
    required_skills: list[str]
    experience_required: str | None
    is_active: bool
    application_deadline: datetime | None
    created_by: int
    application_count: int
    department: str | None
    status: str
    recruiter_status: str
    candidate_status: str
    has_applied: bool
    can_apply: bool
    deadline_passed: bool
    applications_label: str
    created_at: datetime

    class Config:
        from_attributes = True
