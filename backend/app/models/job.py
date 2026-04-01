from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
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

    # Requirements
    required_skills = Column(Text)   # later can be JSON
    experience_required = Column(String)

    # Status
    is_active = Column(Boolean, default=True)

    # Ownership
    created_by = Column(Integer)  # user id (admin/recruiter)

    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)