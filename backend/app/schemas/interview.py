from datetime import datetime

from pydantic import BaseModel, Field


class InterviewCreate(BaseModel):
    application_id: int
    interviewer_id: int
    scheduled_at: datetime
    interview_type: str
    mode: str = "online"
    timezone: str | None = None
    notes: str | None = None
    meeting_link: str | None = None
    location: str | None = None


class InterviewUpdate(BaseModel):
    interviewer_id: int | None = None
    scheduled_at: datetime | None = None
    status: str | None = None
    interview_type: str | None = None
    mode: str | None = None
    timezone: str | None = None
    notes: str | None = None
    meeting_link: str | None = None
    location: str | None = None
    candidate_response_status: str | None = None
    candidate_response_reason: str | None = None
    candidate_preferred_slots: list[str] | None = None
    feedback_rating: int | None = None
    feedback_notes: str | None = None
    recruiter_decision: str | None = None


class InterviewCandidateResponse(BaseModel):
    action: str
    reason: str | None = None
    preferred_slots: list[str] = Field(default_factory=list)
    preferred_timezone: str | None = None


class InterviewFeedbackUpdate(BaseModel):
    rating: int | None = None
    notes: str | None = None
    decision: str | None = None


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
    mode: str
    timezone: str | None
    notes: str | None
    meeting_link: str | None
    location: str | None
    candidate_response_status: str
    candidate_response_reason: str | None
    candidate_preferred_slots: list[str]
    feedback_rating: int | None
    feedback_notes: str | None
    recruiter_decision: str | None
    status_history: list[dict]

    class Config:
        from_attributes = True
