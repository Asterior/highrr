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

    # Requirements
    required_skills = Column(JSON, default=list)
    experience_required = Column(String)

    # Status
    is_active = Column(Boolean, default=True)

    # Ownership
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Recruitment metadata
    application_count = Column(Integer, default=0)
    department = Column(String, nullable=True)
    status = Column(String, default="Active")

    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)