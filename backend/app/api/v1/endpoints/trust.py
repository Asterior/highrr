from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.application import Application
from app.models.company_verification import CompanyVerification
from app.models.job import Job
from app.models.recruiter_reputation import RecruiterReputation
from app.models.user import User
from app.models.user_report import UserReport
from app.schemas.trust import (
    CompanyAssessmentRequest,
    CompanyTrustResponse,
    JobRiskResponse,
    RecruiterTrustStatusResponse,
    ReportCreate,
    ReportResponse,
    VerificationQueueItemResponse,
)

router = APIRouter()

ALLOWED_REPORT_CATEGORIES = {"scam", "no_response", "fake_job"}
FREE_EMAIL_DOMAINS = {
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "proton.me",
    "protonmail.com",
}


def _level_from_score(score: int) -> str:
    if score >= 80:
        return "trusted"
    if score >= 55:
        return "verified"
    return "basic"


def _upsert_reputation(db: Session, recruiter_id: int) -> RecruiterReputation:
    reputation = db.query(RecruiterReputation).filter(RecruiterReputation.recruiter_id == recruiter_id).first()
    if not reputation:
        reputation = RecruiterReputation(recruiter_id=recruiter_id)
        db.add(reputation)
        db.flush()
    return reputation


def _calculate_job_risk(db: Session, job: Job) -> tuple[int, list[str]]:
    rules: list[str] = []
    risk = 0

    repeated = (
        db.query(Job)
        .filter(Job.created_by == job.created_by, Job.title == job.title, Job.id != job.id)
        .count()
    )
    if repeated >= 2:
        rules.append("same_job_posted_repeatedly")
        risk += 25

    desc = (job.description or "").strip().lower()
    if len(desc) < 80:
        rules.append("very_short_job_description")
        risk += 20

    recruiter_selected_count = (
        db.query(Application)
        .join(Job, Job.id == Application.job_id)
        .filter(Job.created_by == job.created_by, Application.status == "selected")
        .count()
    )
    recruiter_total_jobs = db.query(Job).filter(Job.created_by == job.created_by).count()
    if recruiter_total_jobs >= 8 and recruiter_selected_count == 0:
        rules.append("many_roles_no_hires")
        risk += 30

    if (job.application_count or 0) >= 100 and (job.recruiter_response_rate or 0) <= 0:
        rules.append("high_applications_zero_response")
        risk += 30

    if job.application_deadline and job.application_deadline <= datetime.utcnow():
        rules.append("deadline_passed")
        risk += 10

    return min(risk, 100), rules


@router.get("/me/status", response_model=RecruiterTrustStatusResponse)
def my_verification_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"recruiter", "admin"}:
        return RecruiterTrustStatusResponse(
            recruiter_id=current_user.id,
            verification_level="trusted",
            trust_score=100,
            can_post_jobs=True,
        )

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == current_user.id).first()
    if not company:
        return RecruiterTrustStatusResponse(
            recruiter_id=current_user.id,
            verification_level="basic",
            trust_score=0,
            can_post_jobs=False,
        )

    return RecruiterTrustStatusResponse(
        recruiter_id=current_user.id,
        verification_level=company.verification_level,
        trust_score=company.trust_score,
        can_post_jobs=company.verification_level in {"verified", "trusted"},
    )


@router.post("/company/assess", response_model=CompanyTrustResponse)
def assess_company(
    payload: CompanyAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"recruiter", "admin"}:
        raise HTTPException(status_code=403, detail="Only recruiters/admins can run company assessment")

    domain = (payload.company_domain or payload.company_email.split("@")[-1]).lower().strip()
    domain_verified = domain not in FREE_EMAIL_DOMAINS

    domain_score = 20 if payload.domain_age_years >= 2 and domain_verified else 8 if domain_verified else 0
    business_score = 30 if payload.business_registry_id else 0

    website_quality = 0
    if payload.website_url:
        website_quality += 4
    if payload.has_https:
        website_quality += 3
    if payload.contact_matches_submission:
        website_quality += 3

    office_score = 10 if payload.office_proof_verified else 0

    employee_score = 0
    if payload.linkedin_company_url:
        employee_score += 5
    if payload.employee_count >= 10:
        employee_score += 5

    score = domain_score + business_score + website_quality + office_score + employee_score
    score -= payload.user_reports_penalty
    score = max(0, min(100, score))

    level = _level_from_score(score)

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == current_user.id).first()
    if not company:
        company = CompanyVerification(recruiter_id=current_user.id)
        db.add(company)

    company.company_name = payload.company_name
    company.company_email = payload.company_email
    company.company_domain = domain
    company.website_url = payload.website_url
    company.verification_level = level
    company.trust_score = score
    company.domain_verified = domain_verified
    company.domain_otp_verified = domain_verified
    company.business_registration_verified = bool(payload.business_registry_id)
    company.business_registry_id = payload.business_registry_id
    company.business_country = payload.business_country
    company.website_quality_score = website_quality
    company.office_proof_verified = payload.office_proof_verified
    company.employee_presence_score = employee_score
    company.last_assessed_at = datetime.utcnow()

    reputation = _upsert_reputation(db, current_user.id)
    db.commit()
    db.refresh(company)
    db.refresh(reputation)

    return CompanyTrustResponse(
        recruiter_id=current_user.id,
        company_name=company.company_name,
        verification_level=company.verification_level,
        trust_score=company.trust_score,
        domain_verified=company.domain_verified,
        business_registration_verified=company.business_registration_verified,
        website_quality_score=company.website_quality_score,
        office_proof_verified=company.office_proof_verified,
        employee_presence_score=company.employee_presence_score,
        response_rate=reputation.response_rate,
        hiring_success_rate=reputation.hiring_success_rate,
    )


@router.get("/company/{recruiter_id}", response_model=CompanyTrustResponse)
def get_company_trust(
    recruiter_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company trust profile not found")

    reputation = _upsert_reputation(db, recruiter_id)
    db.commit()

    return CompanyTrustResponse(
        recruiter_id=recruiter_id,
        company_name=company.company_name,
        verification_level=company.verification_level,
        trust_score=company.trust_score,
        domain_verified=company.domain_verified,
        business_registration_verified=company.business_registration_verified,
        website_quality_score=company.website_quality_score,
        office_proof_verified=company.office_proof_verified,
        employee_presence_score=company.employee_presence_score,
        response_rate=reputation.response_rate,
        hiring_success_rate=reputation.hiring_success_rate,
    )


@router.get("/admin/verification-queue", response_model=list[VerificationQueueItemResponse])
def get_verification_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    companies = (
        db.query(CompanyVerification, User)
        .join(User, User.id == CompanyVerification.recruiter_id)
        .order_by(CompanyVerification.last_assessed_at.desc().nullslast(), CompanyVerification.created_at.desc())
        .all()
    )

    queue: list[VerificationQueueItemResponse] = []
    for company, recruiter in companies:
        reputation = db.query(RecruiterReputation).filter(RecruiterReputation.recruiter_id == recruiter.id).first()
        report_counts = db.query(UserReport.category, UserReport.id).filter(UserReport.recruiter_id == recruiter.id).all()
        reports_count = len(report_counts)
        scam_reports = sum(1 for category, _ in report_counts if category == "scam")
        no_response_reports = sum(1 for category, _ in report_counts if category == "no_response")
        fake_job_reports = sum(1 for category, _ in report_counts if category == "fake_job")

        queue.append(
            VerificationQueueItemResponse(
                recruiter_id=recruiter.id,
                recruiter_name=recruiter.name,
                recruiter_email=recruiter.email,
                company_name=company.company_name,
                company_domain=company.company_domain,
                company_email=company.company_email,
                website_url=company.website_url,
                verification_level=company.verification_level,
                trust_score=company.trust_score,
                reports_count=reports_count,
                scam_reports_count=scam_reports,
                no_response_reports_count=no_response_reports,
                fake_job_reports_count=fake_job_reports,
                response_rate=(reputation.response_rate if reputation else 100.0),
                hiring_success_rate=(reputation.hiring_success_rate if reputation else 0.0),
                last_assessed_at=company.last_assessed_at,
                created_at=company.created_at,
                updated_at=company.updated_at,
                review_status="reviewed" if company.last_assessed_at else "pending",
            )
        )

    return queue


@router.post("/report", response_model=ReportResponse)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = payload.category.strip().lower()
    if category not in ALLOWED_REPORT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid report category")

    if payload.job_id is None and payload.recruiter_id is None:
        raise HTTPException(status_code=400, detail="Either job_id or recruiter_id is required")

    recruiter_id = payload.recruiter_id
    if recruiter_id is None and payload.job_id is not None:
        job = db.query(Job).filter(Job.id == payload.job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        recruiter_id = job.created_by

    report = UserReport(
        reporter_id=current_user.id,
        job_id=payload.job_id,
        recruiter_id=recruiter_id,
        category=category,
        details=payload.details,
    )
    db.add(report)

    if recruiter_id is not None:
        rep = _upsert_reputation(db, recruiter_id)
        rep.reports_count += 1
        if category == "scam":
            rep.scam_reports_count += 1
            rep.trust_penalty += 20
        elif category == "no_response":
            rep.no_response_reports_count += 1
            rep.trust_penalty += 10
        elif category == "fake_job":
            rep.fake_job_reports_count += 1
            rep.trust_penalty += 15

        company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
        if company:
            company.trust_score = max(0, company.trust_score - min(30, rep.trust_penalty // 2))
            company.verification_level = _level_from_score(company.trust_score)

    db.commit()
    db.refresh(report)
    return report


@router.get("/jobs/{job_id}/risk", response_model=JobRiskResponse)
def get_job_risk(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    risk_score, rules = _calculate_job_risk(db, job)
    job.fraud_flags = rules
    job.is_flagged = risk_score >= 50

    if job.posted_expires_at and job.posted_expires_at <= datetime.utcnow():
        job.is_active = False
        rules = [*rules, "job_expired"]

    db.commit()

    return JobRiskResponse(
        job_id=job_id,
        is_flagged=job.is_flagged,
        risk_score=risk_score,
        rules_triggered=rules,
    )


@router.post("/jobs/{job_id}/renew")
def renew_job_posting(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"recruiter", "admin"}:
        raise HTTPException(status_code=403, detail="Not authorized")

    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.role == "recruiter" and job.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot renew a job not created by you")

    now = datetime.utcnow()
    base = job.posted_expires_at if job.posted_expires_at and job.posted_expires_at > now else now
    job.posted_expires_at = base + timedelta(days=30)
    job.renewed_count = (job.renewed_count or 0) + 1
    job.is_active = True

    db.commit()

    return {
        "message": "Job renewed for 30 days",
        "job_id": job.id,
        "posted_expires_at": job.posted_expires_at,
        "renewed_count": job.renewed_count,
    }
