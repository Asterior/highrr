from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Index
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
    is_active = Column(Boolean, default=True, index=True)

    # Ownership
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Recruitment metadata
    application_count = Column(Integer, default=0)
    department = Column(String, nullable=True, index=True)
    status = Column(String, default="Active", index=True)

    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_jobs_is_active_created_at', 'is_active', 'created_at', postgresql_using='btree'),
        Index('idx_jobs_department_status', 'department', 'status'),
        Index('idx_jobs_created_by', 'created_by'),
    )