"""In-app notifications generated from alert matches and future platform events."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Notification(Base):
    """Represents a single in-app notification."""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, default="job_alert", nullable=False)
    title = Column(String, nullable=False)
    body = Column(String, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=True, index=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    job = relationship("Job")
