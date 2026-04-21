from datetime import datetime, timedelta
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_admin, get_current_user
from app.core.errors import not_found
from app.db.deps import get_db
from app.models.application import Application
from app.models.company_verification import CompanyVerification
from app.models.employer_verification import EmployerVerification
from app.models.job import Job
from app.models.recruiter_reputation import RecruiterReputation
from app.models.user import User
from app.models.user_report import UserReport
from app.services.employer_verification import run_verification
from app.schemas.trust import (
    AdminVerificationReviewRequest,
    CompanyAssessmentRequest,
    CompanyTrustResponse,
    JobRiskResponse,
    RecruiterVerificationProfileResponse,
    RecruiterTrustStatusResponse,
    ReportCreate,
    ReportResponse,
    VerifyEmployerRequest,
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


def _assessment_from_payload(payload: CompanyAssessmentRequest) -> tuple[int, str, bool, int, int]:
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

    return score, domain, domain_verified, website_quality, employee_score


def _parse_pending_payload(raw_payload: str | None) -> CompanyAssessmentRequest | None:
    if not raw_payload:
        return None
    try:
        return CompanyAssessmentRequest(**json.loads(raw_payload))
    except Exception:
        return None


def _auto_verify_from_profile(
    db: Session,
    recruiter_id: int,
    business_registry_id: str | None,
    company_email: str | None,
    website_url: str | None,
    company_domain: str | None,
    linkedin_company_url: str | None,
) -> None:
    """Runs automated recruiter checks from profile fields for candidate-visible badges."""
    website = (website_url or company_domain or "").strip()
    run_verification(
        recruiter_id=recruiter_id,
        gst=(business_registry_id or "").strip(),
        company_email=(company_email or "").strip(),
        company_website=website,
        linkedin_url=(linkedin_company_url or "").strip(),
        db=db,
    )


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
            review_status="approved",
            is_locked=False,
        )

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == current_user.id).first()
    if not company:
        return RecruiterTrustStatusResponse(
            recruiter_id=current_user.id,
            verification_level="basic",
            trust_score=0,
            can_post_jobs=False,
            review_status="draft",
            is_locked=False,
        )

    return RecruiterTrustStatusResponse(
        recruiter_id=current_user.id,
        verification_level=company.verification_level,
        trust_score=company.trust_score,
        can_post_jobs=company.verification_level in {"verified", "trusted"},
        review_status=company.review_status or "draft",
        is_locked=bool(company.is_locked),
        submitted_at=company.submitted_at,
        reviewed_at=company.reviewed_at,
    )


@router.get("/me/profile", response_model=RecruiterVerificationProfileResponse)
def get_my_verification_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"recruiter", "admin"}:
        raise HTTPException(status_code=403, detail="Only recruiters/admins can access verification profile")

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == current_user.id).first()
    if not company:
        return RecruiterVerificationProfileResponse(
            recruiter_id=current_user.id,
            company_name="",
            verification_level="basic",
            trust_score=0,
            can_post_jobs=False,
            review_status="draft",
            is_locked=False,
        )

    pending = _parse_pending_payload(company.pending_payload)
    source = pending if pending and company.review_status in {"pending_review", "rejected"} else None

    return RecruiterVerificationProfileResponse(
        recruiter_id=current_user.id,
        company_name=(source.company_name if source else company.company_name) or "",
        company_email=(source.company_email if source else company.company_email),
        company_domain=(source.company_domain if source else company.company_domain),
        website_url=(source.website_url if source else company.website_url),
        business_registry_id=(source.business_registry_id if source else company.business_registry_id),
        business_country=(source.business_country if source else company.business_country),
        domain_age_years=(source.domain_age_years if source else (company.domain_age_years or 0)),
        has_https=(source.has_https if source else bool(company.has_https)),
        contact_matches_submission=(source.contact_matches_submission if source else bool(company.contact_matches_submission)),
        office_proof_verified=(source.office_proof_verified if source else company.office_proof_verified),
        linkedin_company_url=(source.linkedin_company_url if source else company.linkedin_company_url),
        employee_count=(source.employee_count if source else (company.employee_count or 0)),
        user_reports_penalty=(source.user_reports_penalty if source else (company.user_reports_penalty or 0)),
        verification_level=company.verification_level or "basic",
        trust_score=company.trust_score or 0,
        can_post_jobs=(company.verification_level in {"verified", "trusted"}),
        review_status=company.review_status or "draft",
        is_locked=bool(company.is_locked),
        admin_notes=company.admin_notes,
        submitted_at=company.submitted_at,
        reviewed_at=company.reviewed_at,
    )


@router.post("/company/assess", response_model=CompanyTrustResponse)
def assess_company(
    payload: CompanyAssessmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"recruiter", "admin"}:
        raise HTTPException(status_code=403, detail="Only recruiters/admins can submit company assessment")

    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can submit profile for review")

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == current_user.id).first()
    if not company:
        company = CompanyVerification(recruiter_id=current_user.id, company_name=payload.company_name)
        db.add(company)

    company.pending_payload = json.dumps(payload.model_dump())
    company.review_status = "pending_review"
    company.is_locked = True
    company.submitted_at = datetime.utcnow()
    company.admin_notes = None
    company.domain_age_years = payload.domain_age_years
    company.has_https = payload.has_https
    company.contact_matches_submission = payload.contact_matches_submission
    company.linkedin_company_url = payload.linkedin_company_url
    company.employee_count = payload.employee_count
    company.user_reports_penalty = payload.user_reports_penalty

    reputation = _upsert_reputation(db, current_user.id)
    db.commit()
    db.refresh(company)
    db.refresh(reputation)

    _auto_verify_from_profile(
        db=db,
        recruiter_id=current_user.id,
        business_registry_id=payload.business_registry_id,
        company_email=payload.company_email,
        website_url=payload.website_url,
        company_domain=payload.company_domain,
        linkedin_company_url=payload.linkedin_company_url,
    )

    score, _domain, domain_verified, website_quality, employee_score = _assessment_from_payload(payload)
    level = _level_from_score(score)

    return CompanyTrustResponse(
        recruiter_id=current_user.id,
        company_name=payload.company_name,
        verification_level=level,
        trust_score=score,
        domain_verified=domain_verified,
        business_registration_verified=bool(payload.business_registry_id),
        website_quality_score=website_quality,
        office_proof_verified=payload.office_proof_verified,
        employee_presence_score=employee_score,
        response_rate=reputation.response_rate,
        hiring_success_rate=reputation.hiring_success_rate,
    )


@router.post("/company/unlock", response_model=RecruiterTrustStatusResponse)
def unlock_company_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "recruiter":
        raise HTTPException(status_code=403, detail="Only recruiters can edit verification profile")

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Verification profile not found")

    company.is_locked = False
    company.review_status = "draft"
    company.pending_payload = None
    company.admin_notes = None
    db.commit()
    db.refresh(company)

    return RecruiterTrustStatusResponse(
        recruiter_id=current_user.id,
        verification_level=company.verification_level,
        trust_score=company.trust_score,
        can_post_jobs=company.verification_level in {"verified", "trusted"},
        review_status=company.review_status or "draft",
        is_locked=bool(company.is_locked),
        submitted_at=company.submitted_at,
        reviewed_at=company.reviewed_at,
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
        pending = _parse_pending_payload(company.pending_payload)
        source = pending if pending and company.review_status in {"pending_review", "rejected"} else None
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
                company_name=(source.company_name if source else company.company_name),
                company_domain=(source.company_domain if source else company.company_domain),
                company_email=(source.company_email if source else company.company_email),
                website_url=(source.website_url if source else company.website_url),
                business_registry_id=(source.business_registry_id if source else company.business_registry_id),
                business_country=(source.business_country if source else company.business_country),
                domain_age_years=(source.domain_age_years if source else (company.domain_age_years or 0)),
                has_https=(source.has_https if source else bool(company.has_https)),
                contact_matches_submission=(source.contact_matches_submission if source else bool(company.contact_matches_submission)),
                office_proof_verified=(source.office_proof_verified if source else bool(company.office_proof_verified)),
                linkedin_company_url=(source.linkedin_company_url if source else company.linkedin_company_url),
                employee_count=(source.employee_count if source else (company.employee_count or 0)),
                user_reports_penalty=(source.user_reports_penalty if source else (company.user_reports_penalty or 0)),
                verification_level=company.verification_level,
                trust_score=company.trust_score,
                reports_count=reports_count,
                scam_reports_count=scam_reports,
                no_response_reports_count=no_response_reports,
                fake_job_reports_count=fake_job_reports,
                response_rate=(reputation.response_rate if reputation else 100.0),
                hiring_success_rate=(reputation.hiring_success_rate if reputation else 0.0),
                business_registration_verified=bool(company.business_registration_verified),
                admin_notes=company.admin_notes,
                last_assessed_at=company.last_assessed_at,
                submitted_at=company.submitted_at,
                reviewed_at=company.reviewed_at,
                created_at=company.created_at,
                updated_at=company.updated_at,
                review_status=company.review_status or "draft",
            )
        )

    return queue


@router.get("/admin/verification-profile/{recruiter_id}", response_model=RecruiterVerificationProfileResponse)
def get_admin_verification_profile(
    recruiter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Verification profile not found")

    pending = _parse_pending_payload(company.pending_payload)
    source = pending if pending and company.review_status in {"pending_review", "rejected"} else None

    return RecruiterVerificationProfileResponse(
        recruiter_id=recruiter_id,
        company_name=(source.company_name if source else company.company_name) or "",
        company_email=(source.company_email if source else company.company_email),
        company_domain=(source.company_domain if source else company.company_domain),
        website_url=(source.website_url if source else company.website_url),
        business_registry_id=(source.business_registry_id if source else company.business_registry_id),
        business_country=(source.business_country if source else company.business_country),
        domain_age_years=(source.domain_age_years if source else (company.domain_age_years or 0)),
        has_https=(source.has_https if source else bool(company.has_https)),
        contact_matches_submission=(source.contact_matches_submission if source else bool(company.contact_matches_submission)),
        office_proof_verified=(source.office_proof_verified if source else bool(company.office_proof_verified)),
        linkedin_company_url=(source.linkedin_company_url if source else company.linkedin_company_url),
        employee_count=(source.employee_count if source else (company.employee_count or 0)),
        user_reports_penalty=(source.user_reports_penalty if source else (company.user_reports_penalty or 0)),
        verification_level=company.verification_level or "basic",
        trust_score=company.trust_score or 0,
        can_post_jobs=(company.verification_level in {"verified", "trusted"}),
        review_status=company.review_status or "draft",
        is_locked=bool(company.is_locked),
        admin_notes=company.admin_notes,
        submitted_at=company.submitted_at,
        reviewed_at=company.reviewed_at,
    )


@router.post("/admin/verification-queue/{recruiter_id}/review", response_model=VerificationQueueItemResponse)
def review_company_submission(
    recruiter_id: int,
    payload: AdminVerificationReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
    recruiter = db.query(User).filter(User.id == recruiter_id).first()
    if not company or not recruiter:
        raise HTTPException(status_code=404, detail="Verification submission not found")

    pending = _parse_pending_payload(company.pending_payload)
    now = datetime.utcnow()

    if payload.action == "approve":
        if pending:
            score, domain, domain_verified, website_quality, employee_score = _assessment_from_payload(pending)
            level = _level_from_score(score)

            company.company_name = pending.company_name
            company.company_email = pending.company_email
            company.company_domain = domain
            company.website_url = pending.website_url
            company.domain_verified = domain_verified
            company.domain_otp_verified = domain_verified
            company.business_registration_verified = bool(pending.business_registry_id)
            company.business_registry_id = pending.business_registry_id
            company.business_country = pending.business_country
            company.domain_age_years = pending.domain_age_years
            company.has_https = pending.has_https
            company.contact_matches_submission = pending.contact_matches_submission
            company.website_quality_score = website_quality
            company.office_proof_verified = pending.office_proof_verified
            company.employee_presence_score = employee_score
            company.linkedin_company_url = pending.linkedin_company_url
            company.employee_count = pending.employee_count
            company.user_reports_penalty = pending.user_reports_penalty

            company.trust_score = payload.trust_score if payload.trust_score is not None else score
            if payload.verification_level:
                company.verification_level = payload.verification_level
            else:
                company.verification_level = _level_from_score(company.trust_score)
        else:
            if payload.trust_score is not None:
                company.trust_score = payload.trust_score
            if payload.verification_level:
                company.verification_level = payload.verification_level

        company.review_status = "approved"
        company.is_locked = True
        company.pending_payload = None
        company.last_assessed_at = now
        company.reviewed_at = now
        company.admin_notes = payload.admin_notes

    else:
        company.review_status = "rejected"
        company.is_locked = True
        company.reviewed_at = now
        company.admin_notes = payload.admin_notes or "Needs updates from recruiter"

    db.commit()
    db.refresh(company)

    _auto_verify_from_profile(
        db=db,
        recruiter_id=recruiter.id,
        business_registry_id=company.business_registry_id,
        company_email=company.company_email,
        website_url=company.website_url,
        company_domain=company.company_domain,
        linkedin_company_url=company.linkedin_company_url,
    )

    reputation = db.query(RecruiterReputation).filter(RecruiterReputation.recruiter_id == recruiter.id).first()
    report_counts = db.query(UserReport.category, UserReport.id).filter(UserReport.recruiter_id == recruiter.id).all()
    reports_count = len(report_counts)
    scam_reports = sum(1 for category, _ in report_counts if category == "scam")
    no_response_reports = sum(1 for category, _ in report_counts if category == "no_response")
    fake_job_reports = sum(1 for category, _ in report_counts if category == "fake_job")

    return VerificationQueueItemResponse(
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
        business_registration_verified=bool(company.business_registration_verified),
        admin_notes=company.admin_notes,
        last_assessed_at=company.last_assessed_at,
        submitted_at=company.submitted_at,
        reviewed_at=company.reviewed_at,
        created_at=company.created_at,
        updated_at=company.updated_at,
        review_status=company.review_status or "draft",
    )


@router.post("/verify-employer")
def verify_employer(
    body: VerifyEmployerRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin),
):
    """Runs admin-triggered automated employer verification checks."""
    recruiter = db.query(User).filter(User.id == body.recruiter_id).first()
    if not recruiter:
        not_found("Recruiter")

    return run_verification(
        recruiter_id=body.recruiter_id,
        gst=body.gst_number,
        company_email=body.company_email,
        company_website=body.company_website,
        linkedin_url=body.linkedin_url,
        db=db,
    )


@router.get("/employer-badge/{recruiter_id}")
def get_employer_badge(
    recruiter_id: int,
    db: Session = Depends(get_db),
):
    """Returns public recruiter employer verification badge data."""
    recruiter = db.query(User).filter(User.id == recruiter_id).first()
    if not recruiter:
        not_found("Recruiter")

    verification = (
        db.query(EmployerVerification)
        .filter(EmployerVerification.recruiter_id == recruiter_id)
        .first()
    )

    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
    should_refresh = False
    if company and not verification:
        should_refresh = True
    elif company and verification and company.updated_at and verification.updated_at and company.updated_at > verification.updated_at:
        should_refresh = True

    if should_refresh:
        _auto_verify_from_profile(
            db=db,
            recruiter_id=recruiter_id,
            business_registry_id=company.business_registry_id if company else None,
            company_email=company.company_email if company else None,
            website_url=company.website_url if company else None,
            company_domain=company.company_domain if company else None,
            linkedin_company_url=company.linkedin_company_url if company else None,
        )
        verification = (
            db.query(EmployerVerification)
            .filter(EmployerVerification.recruiter_id == recruiter_id)
            .first()
        )

    if not verification:
        return {
            "recruiter_id": recruiter_id,
            "badge_level": "unverified",
            "gst_verified": False,
            "domain_verified": False,
            "linkedin_verified": False,
            "verified_at": None,
        }

    return {
        "recruiter_id": recruiter_id,
        "badge_level": verification.badge_level,
        "gst_verified": verification.gst_verified,
        "domain_verified": verification.domain_verified,
        "linkedin_verified": verification.linkedin_verified,
        "verified_at": verification.verified_at,
    }


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
