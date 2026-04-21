"""Automated employer verification checks and badge upsert service."""

import re
from datetime import datetime
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from app.models.employer_verification import EmployerVerification


def verify_gst_number(gst: str) -> bool:
    """Validates Indian GST number format using regex."""
    if not gst or not isinstance(gst, str):
        return False
    pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$"
    return bool(re.match(pattern, gst.strip().upper()))


def verify_domain_match(company_email: str, company_website: str) -> bool:
    """Checks if company email domain exactly matches website domain."""
    try:
        if not company_email or "@" not in company_email:
            return False
        if not company_website:
            return False

        email_domain = company_email.split("@")[1].strip().lower()
        parsed = urlparse(
            company_website
            if company_website.startswith("http")
            else f"https://{company_website}"
        )
        site_domain = parsed.netloc.lower().lstrip("www.")
        email_domain_clean = email_domain.lstrip("www.")
        return email_domain_clean == site_domain
    except Exception:
        return False


def verify_linkedin_url(linkedin_url: str) -> bool:
    """Validates LinkedIn company page URL format."""
    if not linkedin_url or not isinstance(linkedin_url, str):
        return False
    pattern = r"^https://(www\.)?linkedin\.com/company/[a-zA-Z0-9\-_%.]+/?$"
    return bool(re.match(pattern, linkedin_url.strip()))


def calculate_badge_level(gst_ok: bool, domain_ok: bool, linkedin_ok: bool) -> str:
    """Computes badge level from passed verification checks."""
    passed = sum([gst_ok, domain_ok, linkedin_ok])
    if passed == 3:
        return "verified"
    if passed >= 1:
        return "partial"
    return "unverified"


def run_verification(
    recruiter_id: int,
    gst: str,
    company_email: str,
    company_website: str,
    linkedin_url: str,
    db: Session,
) -> dict:
    """Runs checks and upserts verification result for recruiter."""
    gst_ok = verify_gst_number(gst)
    domain_ok = verify_domain_match(company_email, company_website)
    linkedin_ok = verify_linkedin_url(linkedin_url)
    badge = calculate_badge_level(gst_ok, domain_ok, linkedin_ok)

    now = datetime.utcnow()
    existing = (
        db.query(EmployerVerification)
        .filter(EmployerVerification.recruiter_id == recruiter_id)
        .first()
    )

    if existing:
        existing.gst_verified = gst_ok
        existing.domain_verified = domain_ok
        existing.linkedin_verified = linkedin_ok
        existing.badge_level = badge
        existing.verified_at = now
        existing.updated_at = now
    else:
        db.add(
            EmployerVerification(
                recruiter_id=recruiter_id,
                gst_verified=gst_ok,
                domain_verified=domain_ok,
                linkedin_verified=linkedin_ok,
                badge_level=badge,
                verified_at=now,
            )
        )

    db.commit()

    return {
        "recruiter_id": recruiter_id,
        "gst_verified": gst_ok,
        "domain_verified": domain_ok,
        "linkedin_verified": linkedin_ok,
        "badge_level": badge,
        "verified_at": now.isoformat(),
    }
