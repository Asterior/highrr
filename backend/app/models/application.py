from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from datetime import datetime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.candidate_profile import CandidateProfile

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    candidate_name = Column(String, nullable=False)
    candidate_email = Column(String, nullable=False)

    status = Column(String, default="applied")

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

    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    candidate_profile_id = Column(Integer, ForeignKey("candidate_profiles.id"))
    candidate_profile = relationship("CandidateProfile")