from datetime import datetime

from pydantic import BaseModel, Field


class JobCreate(BaseModel):
    title: str
    description: str
    location: str | None = None
    salary: str
    job_type: str
    responsibilities: str
    hiring_timeline: str
    actively_hiring: bool = True
    required_skills: list[str] = Field(default_factory=list)
    experience_required: str | None = None
    application_count: int = 0
    department: str | None = None
    status: str = "Active"
    is_active: bool = True
    application_deadline: datetime | None = None


class JobUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    location: str | None = None
    salary: str | None = None
    job_type: str | None = None
    responsibilities: str | None = None
    hiring_timeline: str | None = None
    actively_hiring: bool | None = None
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
    responsibilities: str | None
    hiring_timeline: str | None
    actively_hiring: bool
    required_skills: list[str]
    experience_required: str | None
    is_active: bool
    application_deadline: datetime | None
    posted_expires_at: datetime | None
    renewed_count: int
    created_by: int
    application_count: int
    department: str | None
    status: str
    recruiter_response_rate: int
    is_flagged: bool
    fraud_flags: list[str]
    company_verification_level: str = "basic"
    company_trust_score: int = 0
    recruiter_status: str = "Inactive"
    candidate_status: str = "Inactive"
    has_applied: bool = False
    can_apply: bool = False
    deadline_passed: bool = False
    applications_label: str = "No applications received"
    created_at: datetime

    class Config:
        from_attributes = True