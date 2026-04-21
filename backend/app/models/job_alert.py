"""Job alert preferences saved by candidates."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class JobAlert(Base):
    """Stores candidate job alert preferences and trigger timestamps."""

    __tablename__ = "job_alerts"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role_keywords = Column(JSON, nullable=False, default=list)
    location = Column(String, nullable=True)
    min_salary = Column(Integer, nullable=True)
    max_experience = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_triggered_at = Column(DateTime, nullable=True)

    candidate = relationship("User")
