"""Employer verification model for automated recruiter checks."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class EmployerVerification(Base):
    __tablename__ = "employer_verifications"

    id = Column(Integer, primary_key=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    gst_verified = Column(Boolean, default=False, nullable=False)
    domain_verified = Column(Boolean, default=False, nullable=False)
    linkedin_verified = Column(Boolean, default=False, nullable=False)
    trust_score = Column(Integer, default=0, nullable=False)
    verification_level = Column(String(20), default="unverified", nullable=False)
    badge_level = Column(String(20), default="unverified", nullable=False)
    verified_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recruiter = relationship("User", foreign_keys=[recruiter_id])
