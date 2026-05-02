from datetime import datetime, timedelta
import json

from fastapi import APIRouter, Depends, HTTPException, Query
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
from app.services.employer_verification import (
    run_verification,
    verify_dns_mx_record,
    verify_domain_match,
    verify_gst_number,
    verify_linkedin_url,
    verify_website_exists,
)
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


def _level_from_score(score: int, kyc_status: str | None = None) -> str:
    if score >= 120 and (kyc_status or "pending") == "approved":
        return "trusted"
    if score >= 80:
        return "strong"
    if score >= 40:
        return "basic"
    return "unverified"


def _effective_verification_state(company: CompanyVerification) -> tuple[int, str, bool]:
    score = int(company.trust_score or 0)
    if company.email_verified and (company.verification_level or "").lower() not in {"strong", "trusted"}:
        score += 10
    score = min(score, 150)
    level = _level_from_score(score, company.kyc_status)
    can_post_jobs = level in {"strong", "trusted"} and (company.review_status or "draft") == "approved"
    return score, level, can_post_jobs


def _normalize_domain(value: str | None) -> str:
    if not value:
        return ""
    cleaned = value.strip().lower()
    cleaned = cleaned.replace("https://", "").replace("http://", "")
    cleaned = cleaned.split("/", 1)[0]
    if cleaned.startswith("www."):
        cleaned = cleaned[4:]
    return cleaned


def _assessment_from_payload(
    payload: CompanyAssessmentRequest,
    company: CompanyVerification | None = None,
) -> dict[str, int | bool | str]:
    email_domain = payload.company_email.split("@", 1)[-1].lower().strip() if "@" in payload.company_email else ""
    business_domain = _normalize_domain(payload.company_domain or payload.website_url or email_domain)
    website_domain = _normalize_domain(payload.website_url)
    domain_verified = bool(email_domain and business_domain and email_domain == business_domain)
    business_registration_verified = verify_gst_number(payload.business_registry_id)
    website_verified = verify_website_exists(payload.website_url)
    dns_verified = verify_dns_mx_record(business_domain)
    linkedin_verified = verify_linkedin_url(payload.linkedin_company_url)
    email_verified = bool(company.email_verified) if company else False
    employee_presence_score = min(payload.employee_count // 10, 10)
    website_quality_score = 10 if payload.has_https else 0
    response_rate = 100 if payload.contact_matches_submission else 55
    hiring_success_rate = 100 if payload.office_proof_verified else 60

    score = 0
    score += 24 if domain_verified else 0
    score += 26 if business_registration_verified else 0
    score += 16 if website_verified else 0
    score += 12 if dns_verified else 0
    score += 16 if linkedin_verified else 0
    score += 10 if email_verified else 0
    score += website_quality_score
    score += 12 if payload.contact_matches_submission else 0
    score += 12 if payload.office_proof_verified else 0
    score += employee_presence_score
    score -= min(payload.user_reports_penalty, 30)
    score = max(0, min(150, score))

    kyc_status = company.kyc_status if company else "pending"
    return {
        "trust_score": score,
        "verification_level": _level_from_score(score, kyc_status),
        "domain_verified": domain_verified,
        "business_registration_verified": business_registration_verified,
        "website_verified": website_verified,
        "dns_verified": dns_verified,
        "linkedin_verified": linkedin_verified,
        "email_verified": email_verified,
        "website_quality_score": website_quality_score,
        "office_proof_verified": payload.office_proof_verified,
        "employee_presence_score": employee_presence_score,
        "response_rate": response_rate,
        "hiring_success_rate": hiring_success_rate,
    }


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

    effective_score, effective_level, can_post_jobs = _effective_verification_state(company)

    return RecruiterTrustStatusResponse(
        recruiter_id=current_user.id,
        verification_level=effective_level,
        trust_score=effective_score,
        can_post_jobs=can_post_jobs,
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
            company_email=None,
            company_domain=None,
            website_url=None,
            business_registry_id=None,
            business_country=None,
            domain_age_years=0,
            has_https=False,
            contact_matches_submission=False,
            office_proof_verified=False,
            linkedin_company_url=None,
            employee_count=0,
            user_reports_penalty=0,
            gst_verified=False,
            email_verified=False,
            website_verified=False,
            linkedin_verified=False,
            dns_verified=False,
            verification_level="unverified",
            trust_score=0,
            can_post_jobs=False,
            review_status="draft",
            is_locked=False,
            kyc_status="pending",
            gst_certificate_url=None,
            business_proof_url=None,
            admin_notes=None,
            submitted_at=None,
            reviewed_at=None,
        )

    pending = _parse_pending_payload(company.pending_payload)
    source = pending if pending and company.review_status in {"pending_review", "rejected"} else None

    effective_score, effective_level, can_post_jobs = _effective_verification_state(company)

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
        office_proof_verified=(source.office_proof_verified if source else bool(company.office_proof_verified)),
        linkedin_company_url=(source.linkedin_company_url if source else company.linkedin_company_url),
        employee_count=(source.employee_count if source else (company.employee_count or 0)),
        user_reports_penalty=(source.user_reports_penalty if source else (company.user_reports_penalty or 0)),
        gst_verified=bool(company.gst_verified),
        email_verified=bool(company.email_verified),
        website_verified=bool(company.website_verified),
        linkedin_verified=bool(company.linkedin_verified),
        dns_verified=bool(company.dns_verified),
        verification_level=effective_level,
        trust_score=effective_score,
        can_post_jobs=can_post_jobs,
        review_status=company.review_status or "draft",
        is_locked=bool(company.is_locked),
        kyc_status=company.kyc_status or "pending",
        gst_certificate_url=company.gst_certificate_url,
        business_proof_url=company.business_proof_url,
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

    assessment = _assessment_from_payload(payload, company)

    return CompanyTrustResponse(
        recruiter_id=current_user.id,
        company_name=payload.company_name,
        verification_level=str(assessment["verification_level"]),
        trust_score=int(assessment["trust_score"]),
        domain_verified=bool(assessment["domain_verified"]),
        business_registration_verified=bool(assessment["business_registration_verified"]),
        website_quality_score=int(assessment["website_quality_score"]),
        office_proof_verified=bool(assessment["office_proof_verified"]),
        employee_presence_score=int(assessment["employee_presence_score"]),
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

    effective_score, effective_level, can_post_jobs = _effective_verification_state(company)

    return RecruiterTrustStatusResponse(
        recruiter_id=current_user.id,
        verification_level=effective_level,
        trust_score=effective_score,
        can_post_jobs=can_post_jobs,
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
        gst_verified=bool(company.gst_verified),
        email_verified=bool(company.email_verified),
        website_verified=bool(company.website_verified),
        linkedin_verified=bool(company.linkedin_verified),
        dns_verified=bool(company.dns_verified),
        verification_level=company.verification_level or "unverified",
        trust_score=company.trust_score or 0,
        can_post_jobs=(company.verification_level in {"strong", "trusted"}),
        review_status=company.review_status or "draft",
        is_locked=bool(company.is_locked),
        kyc_status=company.kyc_status or "pending",
        gst_certificate_url=company.gst_certificate_url,
        business_proof_url=company.business_proof_url,
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
            assessment = _assessment_from_payload(pending, company)

            company.company_name = pending.company_name
            company.company_email = pending.company_email
            company.company_domain = _normalize_domain(pending.company_domain or pending.website_url or pending.company_email)
            company.website_url = pending.website_url
            company.domain_verified = bool(assessment["domain_verified"])
            company.domain_otp_verified = bool(assessment["domain_verified"])
            company.business_registration_verified = bool(assessment["business_registration_verified"])
            company.gst_verified = bool(assessment["business_registration_verified"])
            company.business_registry_id = pending.business_registry_id
            company.business_country = pending.business_country
            company.domain_age_years = pending.domain_age_years
            company.has_https = pending.has_https
            company.contact_matches_submission = pending.contact_matches_submission
            company.website_verified = bool(assessment["website_verified"])
            company.dns_verified = bool(assessment["dns_verified"])
            company.linkedin_verified = bool(assessment["linkedin_verified"])
            company.email_verified = bool(assessment["email_verified"])
            company.website_quality_score = int(assessment["website_quality_score"])
            company.office_proof_verified = pending.office_proof_verified
            company.employee_presence_score = int(assessment["employee_presence_score"])
            company.linkedin_company_url = pending.linkedin_company_url
            company.employee_count = pending.employee_count
            company.user_reports_penalty = pending.user_reports_penalty
            company.gst_certificate_url = pending.gst_certificate_url
            company.business_proof_url = pending.business_proof_url
            company.kyc_status = "approved"

            company.trust_score = payload.trust_score if payload.trust_score is not None else int(assessment["trust_score"])
            if payload.verification_level:
                company.verification_level = payload.verification_level
            else:
                company.verification_level = _level_from_score(company.trust_score, company.kyc_status)
        else:
            if payload.trust_score is not None:
                company.trust_score = payload.trust_score
            if payload.verification_level:
                company.verification_level = payload.verification_level
            if company.kyc_status == "pending":
                company.kyc_status = "approved"
            company.verification_level = _level_from_score(company.trust_score, company.kyc_status)

        company.review_status = "approved"
        company.is_locked = True
        company.pending_payload = None
        company.last_assessed_at = now
        company.reviewed_at = now
        company.admin_notes = payload.admin_notes

    else:
        company.review_status = "rejected"
        company.is_locked = True
        company.kyc_status = "rejected"
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
    force_refresh: bool = Query(False),
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
    should_refresh = force_refresh
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
            "verification_level": "unverified",
            "trust_score": 0,
            "gst_verified": False,
            "domain_verified": False,
            "website_verified": False,
            "email_verified": False,
            "dns_verified": False,
            "linkedin_verified": False,
            "gst_certificate_url": None,
            "business_proof_url": None,
            "kyc_status": "pending",
            "verified_at": None,
        }

    # Prefer EmployerVerification fields (public badge), fall back to CompanyVerification
    return {
        "recruiter_id": recruiter_id,
        "badge_level": verification.badge_level or (company.verification_level if company else "unverified"),
        "verification_level": verification.verification_level or (company.verification_level if company else "unverified"),
        "trust_score": verification.trust_score or (company.trust_score if company else 0),
        "gst_verified": bool(verification.gst_verified) or (bool(company.gst_verified) if company else False),
        "domain_verified": bool(verification.domain_verified) or (bool(company.domain_verified) if company else False),
        "website_verified": bool(getattr(verification, "website_verified", False)) or (bool(company.website_verified) if company else False),
        "email_verified": bool(getattr(verification, "email_verified", False)) or (bool(company.email_verified) if company else False),
        "dns_verified": bool(getattr(verification, "dns_verified", False)) or (bool(company.dns_verified) if company else False),
        "linkedin_verified": bool(verification.linkedin_verified) or (bool(company.linkedin_verified) if company else False),
        "gst_certificate_url": getattr(company, "gst_certificate_url", None),
        "business_proof_url": getattr(company, "business_proof_url", None),
        "kyc_status": getattr(company, "kyc_status", None) or "pending",
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
