from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer

from app.db.base import Base


class RecruiterReputation(Base):
    __tablename__ = "recruiter_reputations"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    response_rate = Column(Float, default=100.0)
    hiring_success_rate = Column(Float, default=0.0)
    avg_response_hours = Column(Float, default=0.0)

    reports_count = Column(Integer, default=0)
    scam_reports_count = Column(Integer, default=0)
    no_response_reports_count = Column(Integer, default=0)
    fake_job_reports_count = Column(Integer, default=0)

    flagged_jobs_count = Column(Integer, default=0)
    trust_penalty = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_recruiter_reputation_rates", "response_rate", "hiring_success_rate"),
    )
