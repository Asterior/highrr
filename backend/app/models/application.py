from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from datetime import datetime
from app.db.base import Base


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    status = Column(String, default="applied")

    score = Column(Integer, default=0)

    assigned_to = Column(Integer, nullable=True)

    notes = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)
    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)