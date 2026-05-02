from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CompanyAssessmentRequest(BaseModel):
    company_name: str
    company_email: EmailStr
    company_domain: str | None = None
    website_url: str | None = None
    business_registry_id: str | None = None
    business_country: str | None = None
    domain_age_years: int = Field(0, ge=0)
    has_https: bool = False
    contact_matches_submission: bool = False
    office_proof_verified: bool = False
    linkedin_company_url: str | None = None
    employee_count: int = Field(0, ge=0)
    user_reports_penalty: int = Field(0, ge=0, le=30)
    gst_certificate_url: str | None = None
    business_proof_url: str | None = None


class CompanyTrustResponse(BaseModel):
    recruiter_id: int
    company_name: str
    verification_level: str
    trust_score: int
    domain_verified: bool
    business_registration_verified: bool
    website_quality_score: int
    office_proof_verified: bool
    employee_presence_score: int
    response_rate: float
    hiring_success_rate: float


class RecruiterTrustStatusResponse(BaseModel):
    recruiter_id: int
    verification_level: str
    trust_score: int
    can_post_jobs: bool
    review_status: str = "draft"
    is_locked: bool = False
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None


class RecruiterVerificationProfileResponse(BaseModel):
    recruiter_id: int
    company_name: str
    company_email: str | None = None
    company_domain: str | None = None
    website_url: str | None = None
    business_registry_id: str | None = None
    business_country: str | None = None
    domain_age_years: int = 0
    has_https: bool = False
    contact_matches_submission: bool = False
    office_proof_verified: bool = False
    linkedin_company_url: str | None = None
    employee_count: int = 0
    user_reports_penalty: int = 0
    gst_verified: bool = False
    email_verified: bool = False
    website_verified: bool = False
    linkedin_verified: bool = False
    dns_verified: bool = False
    verification_level: str
    trust_score: int
    can_post_jobs: bool
    review_status: str
    is_locked: bool
    kyc_status: str = "pending"
    gst_certificate_url: str | None = None
    business_proof_url: str | None = None
    admin_notes: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None


class VerificationQueueItemResponse(BaseModel):
    recruiter_id: int
    recruiter_name: str
    recruiter_email: EmailStr
    company_name: str
    company_domain: str | None
    company_email: EmailStr | None
    website_url: str | None
    business_registry_id: str | None = None
    business_country: str | None = None
    domain_age_years: int = 0
    has_https: bool = False
    contact_matches_submission: bool = False
    office_proof_verified: bool = False
    linkedin_company_url: str | None = None
    employee_count: int = 0
    user_reports_penalty: int = 0
    gst_verified: bool = False
    email_verified: bool = False
    website_verified: bool = False
    linkedin_verified: bool = False
    dns_verified: bool = False
    kyc_status: str = "pending"
    gst_certificate_url: str | None = None
    business_proof_url: str | None = None
    verification_level: str
    trust_score: int
    reports_count: int
    scam_reports_count: int
    no_response_reports_count: int
    fake_job_reports_count: int
    response_rate: float
    hiring_success_rate: float
    business_registration_verified: bool = False
    business_country: str | None = None
    admin_notes: str | None = None
    last_assessed_at: datetime | None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    review_status: str


class AdminVerificationReviewRequest(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")
    verification_level: str | None = None
    trust_score: int | None = Field(default=None, ge=0, le=100)
    admin_notes: str | None = None


class VerifyEmployerRequest(BaseModel):
    recruiter_id: int
    gst_number: str
    company_email: str
    company_website: str
    linkedin_url: str


class ReportCreate(BaseModel):
    job_id: int | None = None
    recruiter_id: int | None = None
    category: str
    details: str | None = None


class ReportResponse(BaseModel):
    id: int
    reporter_id: int
    job_id: int | None
    recruiter_id: int | None
    category: str
    details: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class JobRiskResponse(BaseModel):
    job_id: int
    is_flagged: bool
    risk_score: int
    rules_triggered: list[str]
