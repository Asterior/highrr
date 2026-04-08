from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from datetime import datetime
from app.db.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Info
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)

    # Job Details
    location = Column(String)
    salary = Column(String)
    job_type = Column(String)   # full-time / intern / contract
    responsibilities = Column(Text, nullable=True)
    hiring_timeline = Column(String, nullable=True)
    actively_hiring = Column(Boolean, default=True)
    intent_confirmed_at = Column(DateTime, nullable=True)

    # Requirements
    required_skills = Column(JSON, default=list)
    experience_required = Column(String)

    # Status
    is_active = Column(Boolean, default=True)
    application_deadline = Column(DateTime, nullable=True)
    posted_expires_at = Column(DateTime, nullable=True)
    renewed_count = Column(Integer, default=0)

    # Ownership
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Recruitment metadata
    application_count = Column(Integer, default=0)
    department = Column(String, nullable=True)
    status = Column(String, default="Active")
    recruiter_response_rate = Column(Integer, default=100)
    is_flagged = Column(Boolean, default=False)
    fraud_flags = Column(JSON, default=list)

    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)