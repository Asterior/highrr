from datetime import datetime

from pydantic import BaseModel


class InterviewCreate(BaseModel):
    application_id: int
    interviewer_id: int
    scheduled_at: datetime
    interview_type: str
    notes: str | None = None
    meeting_link: str | None = None
    location: str | None = None


class InterviewUpdate(BaseModel):
    interviewer_id: int | None = None
    scheduled_at: datetime | None = None
    status: str | None = None
    interview_type: str | None = None
    notes: str | None = None
    meeting_link: str | None = None
    location: str | None = None


class InterviewResponse(BaseModel):
    id: int
    application_id: int
    candidate_name: str
    job_title: str
    interviewer_id: int
    interviewer_name: str
    scheduled_at: datetime
    status: str
    interview_type: str
    notes: str | None
    meeting_link: str | None
    location: str | None

    class Config:
        from_attributes = True
