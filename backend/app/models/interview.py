from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

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
    notes = Column(Text, nullable=True)
    meeting_link = Column(String, nullable=True)
    location = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
