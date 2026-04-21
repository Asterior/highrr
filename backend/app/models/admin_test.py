from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint

from app.db.base import Base


class AdminTest(Base):
    __tablename__ = "admin_tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    questions = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, default=True)
    due_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdminTestSubmission(Base):
    __tablename__ = "admin_test_submissions"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("admin_tests.id"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    answers = Column(JSON, nullable=False, default=dict)
    score = Column(Float, nullable=False, default=0.0)
    remarks = Column(JSON, nullable=False, default=dict)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("test_id", "candidate_id", name="uq_admin_test_candidate"),
    )
