from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text

from app.db.base import Base


class CompanyVerification(Base):
    __tablename__ = "company_verifications"

    id = Column(Integer, primary_key=True, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    company_name = Column(String, nullable=False)
    company_domain = Column(String, nullable=True)
    company_email = Column(String, nullable=True)
    website_url = Column(String, nullable=True)

    verification_level = Column(String, default="basic", index=True)
    trust_score = Column(Integer, default=0, index=True)

    domain_verified = Column(Boolean, default=False)
    domain_otp_verified = Column(Boolean, default=False)
    dns_verified = Column(Boolean, default=False)

    business_registration_verified = Column(Boolean, default=False)
    business_registry_id = Column(String, nullable=True)
    business_country = Column(String, nullable=True)

    website_quality_score = Column(Integer, default=0)
    office_proof_verified = Column(Boolean, default=False)
    employee_presence_score = Column(Integer, default=0)

    risk_notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    pending_payload = Column(Text, nullable=True)

    review_status = Column(String, default="draft", index=True)
    is_locked = Column(Boolean, default=False)
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    last_assessed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_company_verifications_level_score", "verification_level", "trust_score"),
    )
