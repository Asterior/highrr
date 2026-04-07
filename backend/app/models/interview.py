from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text

from app.db.base import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    candidate_name = Column(String, nullable=False)
    job_title = Column(String, nullable=False)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    interviewer_name = Column(String, nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String, default="scheduled")
    interview_type = Column(String, nullable=False)
    mode = Column(String, default="online")
    timezone = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    meeting_link = Column(String, nullable=True)
    location = Column(String, nullable=True)
    candidate_response_status = Column(String, default="pending")
    candidate_response_reason = Column(Text, nullable=True)
    candidate_preferred_slots = Column(JSON, default=list)
    feedback_rating = Column(Integer, nullable=True)
    feedback_notes = Column(Text, nullable=True)
    recruiter_decision = Column(String, nullable=True)
    status_history = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
