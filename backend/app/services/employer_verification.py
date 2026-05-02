"""Automated employer verification checks and badge upsert service."""

from __future__ import annotations

import logging
import re
from contextlib import suppress
from datetime import datetime
from http.client import HTTPResponse
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from unittest.mock import patch

import dns.resolver
from sqlalchemy.orm import Session

from app.models.company_verification import CompanyVerification
from app.models.employer_verification import EmployerVerification

LOGGER = logging.getLogger(__name__)
FREE_EMAIL_DOMAINS = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "proton.me", "protonmail.com"}


def _normalize_text(value: str | None) -> str:
    return (value or "").strip()


def _normalize_domain(value: str | None) -> str:
    text = _normalize_text(value).lower()
    if text.startswith("www."):
        return text[4:]
    return text


def _email_domain(email: str | None) -> str:
    if not email or "@" not in email:
        return ""
    return _normalize_domain(email.split("@", 1)[1])


def _website_domain(website: str | None) -> str:
    if not website:
        return ""
    parsed = urlparse(website if website.startswith("http") else f"https://{website}")
    return _normalize_domain(parsed.netloc)


def verify_gst_number(gst: str | None) -> bool:
    """Validates GSTIN or numeric registry-style business IDs."""
    if not gst or not isinstance(gst, str):
        return False
    normalized = gst.strip().upper()
    gst_pattern = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$"
    registry_pattern = r"^[0-9]{8,20}$"
    return bool(re.match(gst_pattern, normalized) or re.match(registry_pattern, normalized))


def verify_domain_match(company_email: str | None, company_website: str | None) -> bool:
    """Checks if company email domain exactly matches website domain."""
    try:
        email_domain = _email_domain(company_email)
        site_domain = _website_domain(company_website)
        if not email_domain or not site_domain:
            return False
        return email_domain == site_domain
    except Exception:
        LOGGER.exception("Domain match check failed")
        return False


def verify_website_exists(company_website: str | None) -> bool:
    """Checks whether the website is structurally valid and reachable when possible."""
    try:
        website = _normalize_text(company_website)
        if not website:
            return False
        target = website if website.startswith(("http://", "https://")) else f"https://{website}"
        parsed = urlparse(target)
        hostname = (parsed.netloc or parsed.path or "").split("/", 1)[0].lower()
        looks_valid = bool(hostname and "." in hostname)
        request = Request(target, headers={"User-Agent": "Mozilla/5.0 HighrrVerification/1.0"})
        with suppress(HTTPError):
            with urlopen(request, timeout=5) as response:  # type: ignore[arg-type]
                return getattr(response, "status", 200) == 200
        return looks_valid
    except URLError:
        LOGGER.info("Website check failed for %s", company_website)
        parsed = urlparse(company_website if (company_website or "").startswith("http") else f"https://{company_website or ''}")
        hostname = (parsed.netloc or parsed.path or "").split("/", 1)[0].lower()
        return bool(hostname and "." in hostname)
    except Exception:
        LOGGER.exception("Website existence check failed")
    return False


def verify_dns_mx_record(domain: str | None) -> bool:
    """Checks for MX records, falling back to a syntactic domain check."""
    try:
        normalized = _normalize_domain(domain)
        if not normalized:
            return False
        dns.resolver.resolve(normalized, "MX", lifetime=5)
        return True
    except Exception:
        LOGGER.info("DNS MX check failed for %s", domain)
        return bool(normalized and "." in normalized)


def verify_linkedin_url(linkedin_url: str | None) -> bool:
    """Validates LinkedIn company page URL format and falls back to syntax only."""
    try:
        if not linkedin_url or not isinstance(linkedin_url, str):
            return False
        normalized = linkedin_url.strip()
        pattern = r"^https://(www\.)?linkedin\.com/company/[a-zA-Z0-9\-_%.]+/?$"
        if not re.match(pattern, normalized):
            return False
        if "/in/" in normalized:
            return False
        request = Request(normalized, headers={"User-Agent": "Mozilla/5.0 HighrrVerification/1.0"})
        with suppress(HTTPError):
            with urlopen(request, timeout=5) as response:  # type: ignore[arg-type]
                return getattr(response, "status", 200) == 200
        return True
    except URLError:
        LOGGER.info("LinkedIn check failed for %s", linkedin_url)
        return True
    except Exception:
        LOGGER.exception("LinkedIn validation failed")
    return False


def _compute_verification_level(score: int, kyc_status: str | None = None) -> str:
    if score < 40:
        return "unverified"
    if score < 80:
        return "basic"
    if score < 120:
        return "strong"
    return "trusted" if (kyc_status or "").lower() == "approved" else "strong"


def _sync_company_verification(
    db: Session,
    recruiter_id: int,
    *,
    gst_ok: bool,
    domain_ok: bool,
    website_ok: bool,
    email_ok: bool,
    dns_ok: bool,
    linkedin_ok: bool,
    score: int,
    level: str,
) -> None:
    company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
    if not company:
        return

    company.gst_verified = gst_ok
    company.domain_verified = domain_ok
    company.website_verified = website_ok
    company.email_verified = email_ok
    company.dns_verified = dns_ok
    company.linkedin_verified = linkedin_ok
    company.trust_score = score
    company.verification_level = level
    company.last_assessed_at = datetime.utcnow()
    company.updated_at = datetime.utcnow()


def run_verification(
    recruiter_id: int,
    gst: str,
    company_email: str,
    company_website: str,
    linkedin_url: str,
    db: Session,
) -> dict | bool:
    """Runs checks and upserts verification result for recruiter."""
    try:
        gst_value = _normalize_text(gst).upper()
        company_email_value = _normalize_text(company_email).lower()
        website_value = _normalize_text(company_website)
        linkedin_value = _normalize_text(linkedin_url)

        gst_ok = verify_gst_number(gst_value)
        domain_ok = verify_domain_match(company_email_value, website_value)
        website_ok = verify_website_exists(website_value)
        email_ok = False
        dns_ok = False
        linkedin_ok = False

        company = db.query(CompanyVerification).filter(CompanyVerification.recruiter_id == recruiter_id).first()
        if company:
            email_ok = bool(company.email_verified)
            dns_ok = bool(company.dns_verified) or verify_dns_mx_record(company.company_domain or _email_domain(company.company_email or company_email_value))
        else:
            dns_ok = verify_dns_mx_record(_email_domain(company_email_value) or _website_domain(website_value))

        linkedin_ok = verify_linkedin_url(linkedin_value)

        score = 0
        if gst_ok:
            score += 30
        if domain_ok:
            score += 20
        if website_ok:
            score += 10
        if email_ok:
            score += 50
        if dns_ok:
            score += 20
        if linkedin_ok:
            score += 10

        level = _compute_verification_level(score, company.kyc_status if company else None)
        badge_level = level
        now = datetime.utcnow()

        existing = db.query(EmployerVerification).filter(EmployerVerification.recruiter_id == recruiter_id).first()
        if existing:
            existing.gst_verified = gst_ok
            existing.domain_verified = domain_ok
            existing.linkedin_verified = linkedin_ok
            existing.trust_score = score
            existing.verification_level = level
            existing.badge_level = badge_level
            existing.verified_at = now
            existing.updated_at = now
        else:
            db.add(
                EmployerVerification(
                    recruiter_id=recruiter_id,
                    gst_verified=gst_ok,
                    domain_verified=domain_ok,
                    linkedin_verified=linkedin_ok,
                    trust_score=score,
                    verification_level=level,
                    badge_level=badge_level,
                    verified_at=now,
                )
            )

        _sync_company_verification(
            db,
            recruiter_id,
            gst_ok=gst_ok,
            domain_ok=domain_ok,
            website_ok=website_ok,
            email_ok=email_ok,
            dns_ok=dns_ok,
            linkedin_ok=linkedin_ok,
            score=score,
            level=level,
        )

        db.commit()

        return {
            "success": True,
            "recruiter_id": recruiter_id,
            "gst_verified": gst_ok,
            "domain_verified": domain_ok,
            "website_verified": website_ok,
            "email_verified": email_ok,
            "dns_verified": dns_ok,
            "linkedin_verified": linkedin_ok,
            "trust_score": score,
            "verification_level": level,
            "verified_at": now.isoformat(),
        }
    except Exception:
        LOGGER.exception("Employer verification failed for recruiter_id=%s", recruiter_id)
        db.rollback()
        return False


def _run_self_test() -> dict[str, bool]:
    """Runs deterministic checks for the verification helpers."""
    results: dict[str, bool] = {}

    results["gst_valid"] = verify_gst_number("27ABCDE1234F1Z5")
    results["gst_invalid"] = not verify_gst_number("BADGST")
    results["domain_match"] = verify_domain_match("team@example.com", "https://example.com")
    results["domain_mismatch"] = not verify_domain_match("team@example.com", "https://other.com")

    with patch("app.services.employer_verification.urlopen") as mock_urlopen:
        mock_response = mock_urlopen.return_value.__enter__.return_value
        mock_response.status = 200
        results["website_exists"] = verify_website_exists("https://example.com")

    with patch("app.services.employer_verification.urlopen", side_effect=URLError("offline")):
        results["website_missing"] = not verify_website_exists("https://example.com")

    results["linkedin_valid"] = verify_linkedin_url("https://linkedin.com/company/example/")
    results["linkedin_invalid"] = not verify_linkedin_url("https://linkedin.com/in/example/")

    with patch("dns.resolver.resolve") as mock_resolve:
        mock_resolve.return_value = object()
        results["dns_success"] = verify_dns_mx_record("example.com")

    with patch("dns.resolver.resolve", side_effect=dns.resolver.NXDOMAIN):
        results["dns_failure"] = not verify_dns_mx_record("example.invalid")

    return results
