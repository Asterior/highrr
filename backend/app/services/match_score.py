"""Match score service.
Calculates candidate-job compatibility on a 0-100 scale.
Used by job listing endpoint and alert engine.
No HTTP concerns. Pure business logic.
"""

from __future__ import annotations

import re
from typing import Any

from app.core.constants import EXPERIENCE_WEIGHT, LOCATION_WEIGHT, SALARY_WEIGHT, SKILLS_WEIGHT


def _normalize_text(value: str | None) -> str:
    """Returns lowercase normalized text for matching operations."""
    return (value or "").strip().lower()


def _extract_years(value: str | None, default: float = 0.0) -> float:
    """Extracts the first numeric year value from a freeform string."""
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    match = re.search(r"(\d+(?:\.\d+)?)", str(value))
    if not match:
        return default
    try:
        return float(match.group(1))
    except ValueError:
        return default


def _extract_salary_range(value: str | None) -> tuple[float | None, float | None]:
    """Extracts min and max salary values from a salary range string."""
    if not value:
        return None, None
    numbers = [float(v) for v in re.findall(r"\d+(?:\.\d+)?", value)]
    if not numbers:
        return None, None
    if len(numbers) == 1:
        return numbers[0], numbers[0]
    return min(numbers), max(numbers)


def _score_location(candidate_profile: dict[str, Any], job: dict[str, Any]) -> int:
    """Awards location points based on exact field matching.

    Rules (in order, first match wins):
    - job.is_remote is True: return 15
    - candidate city == job city (strip + lower): return 15
    - candidate state == job state (strip + lower): return 8
    - no match: return 0

    Comparison is case-insensitive and whitespace-stripped.
    Uses exact equality only.
    """
    job_location = _normalize_text(job.get("location"))
    candidate_location = _normalize_text(candidate_profile.get("location"))

    if bool(job.get("is_remote")) or job_location in {"remote", "anywhere", "work from home", "wfh"}:
        return 15

    candidate_city = _normalize_text(candidate_profile.get("city"))
    job_city = _normalize_text(job.get("city"))
    candidate_state = _normalize_text(candidate_profile.get("state"))
    job_state = _normalize_text(job.get("state"))

    if candidate_location in {"remote", "anywhere", "work from home", "wfh"} and job_location in {"remote", "anywhere", "work from home", "wfh"}:
        return 15

    if candidate_city and job_city and candidate_city == job_city:
        return 15
    if candidate_state and job_state and candidate_state == job_state:
        return 8
    return 0


def _score_salary(candidate_profile: dict[str, Any], job: dict[str, Any]) -> int:
    """Awards salary points based on candidate expectation vs job range.

    Rules:
    - If any salary field is missing/None: return 10 (benefit of doubt)
    - candidate expectation within [job_min, job_max]: return 20
    - candidate expectation within [job_min, job_max * 1.2]: return 10
    - otherwise: return 0
    """
    candidate_expectation = candidate_profile.get("expected_salary")
    job_min = job.get("salary_min")
    job_max = job.get("salary_max")

    if candidate_expectation is None or job_min is None or job_max is None:
        return 10

    try:
        candidate_expectation = float(candidate_expectation)
        job_min = float(job_min)
        job_max = float(job_max)
    except (TypeError, ValueError):
        return 10

    if job_min <= candidate_expectation <= job_max:
        return 20
    if job_min <= candidate_expectation <= job_max * 1.2:
        return 10
    return 0


def calculate_match_score(candidate_profile: dict[str, Any], job: dict[str, Any]) -> dict[str, Any]:
    """Calculates the candidate-job compatibility breakdown and overall score.

    Scoring:
    - Skills only (0-100): fraction of matched required skills

    Args:
        candidate_profile: Candidate profile dictionary.
        job: Job dictionary.

    Returns:
        Match scoring dictionary with total score, label, breakdown, and skill gaps.
    """
    required_skills = [
        _normalize_text(skill)
        for skill in (job.get("required_skills") or [])
        if _normalize_text(skill)
    ]
    candidate_skills = {
        _normalize_text(skill.get("skill_name") if isinstance(skill, dict) else str(skill))
        for skill in (candidate_profile.get("skills") or [])
        if _normalize_text(skill.get("skill_name") if isinstance(skill, dict) else str(skill))
    }

    if required_skills:
        matched_skills = sorted({skill for skill in required_skills if skill in candidate_skills})
        missing_skills = sorted({skill for skill in required_skills if skill not in candidate_skills})
        skills_score = int(round((len(matched_skills) / max(len(required_skills), 1)) * SKILLS_WEIGHT))
    else:
        matched_skills = []
        missing_skills = []
        skills_score = SKILLS_WEIGHT

    total_score = int(skills_score)
    if total_score >= 80:
        label = "Excellent"
    elif total_score >= 60:
        label = "Good"
    elif total_score >= 40:
        label = "Fair"
    else:
        label = "Low"

    return {
        "total_score": total_score,
        "match_label": label,
        "breakdown": {
            "skills": int(skills_score),
            "experience": 0,
            "location": 0,
            "salary": 0,
        },
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
    }
