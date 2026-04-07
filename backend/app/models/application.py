from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False, index=True)

    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, nullable=False)

    status = Column(String, default="applied", index=True)
    score = Column(Integer, default=0)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    notes = Column(String, nullable=True)

    skills = Column(JSON, default=list)
    experience_years = Column(Integer, default=0)
    avatar = Column(String, nullable=True)
    role = Column(String, nullable=True)
    location = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    cgpa = Column(Float, nullable=True)
    resume_url = Column(String, nullable=True)
    status_history = Column(JSON, default=list)

    candidate_profile_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=True, index=True)
    candidate_profile = relationship("CandidateProfile", back_populates="applications")

    applied_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_applications_job_id_status", "job_id", "status"),
        Index("idx_applications_user_id_status", "user_id", "status"),
    )
