import re
import json
import os
import urllib.error
import urllib.request

from sqlalchemy.orm import Session

from app.models.candidate_profile import CandidateProfile
from app.models.job import Job

STOPWORDS = {
    "and", "or", "the", "a", "an", "to", "for", "of", "in", "on", "with", "is", "are", "as", "at",
    "from", "by", "this", "that", "will", "be", "we", "you", "our", "your", "their", "role",
}


def _gemini_enabled() -> bool:
    return os.getenv("ENABLE_GEMINI_ATS", "true").lower() == "true" and bool(os.getenv("GEMINI_API_KEY"))


def _gemini_insights(
    *,
    job_title: str,
    job_description: str | None,
    required_skills: list[str],
    matched_skills: list[str],
    missing_skills: list[str],
    current_score: int,
) -> dict | None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    prompt = (
        "You are an ATS evaluator. Return ONLY valid JSON with keys strengths and improvements. "
        "Each value must be an array of short strings. Max 4 strengths and 5 improvements. "
        f"Role: {job_title}. "
        f"Current ATS score: {current_score}. "
        f"Required skills: {', '.join(required_skills[:20])}. "
        f"Matched skills: {', '.join(matched_skills[:20])}. "
        f"Missing skills: {', '.join(missing_skills[:20])}. "
        f"Job description: {(job_description or '')[:1200]}"
    )

    body = {
        "contents": [
            {
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
            text = (
                payload.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )
            if not text:
                return None
            parsed = json.loads(text)
            strengths = parsed.get("strengths", [])
            improvements = parsed.get("improvements", [])
            if not isinstance(strengths, list) or not isinstance(improvements, list):
                return None
            return {
                "strengths": [str(item) for item in strengths[:4]],
                "improvements": [str(item) for item in improvements[:5]],
            }
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        return None


def _tokenize(value: str | None) -> list[str]:
    if not value:
        return []
    words = re.findall(r"[a-zA-Z0-9+#.-]{2,}", value.lower())
    return [word for word in words if word not in STOPWORDS]


def _extract_years(value: str | None) -> float:
    if not value:
        return 0.0
    match = re.search(r"(\d+(?:\.\d+)?)", value)
    return float(match.group(1)) if match else 0.0


def _safe_pct(matched: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return (matched / total) * 100.0


def score_job_fit(profile: CandidateProfile, job: Job) -> dict:
    candidate_skills = {skill.skill_name.strip().lower() for skill in (profile.skills or []) if skill.skill_name}
    required_skills = [skill.strip().lower() for skill in (job.required_skills or []) if skill and str(skill).strip()]
    matched_skills = [skill for skill in required_skills if skill in candidate_skills]
    missing_skills = [skill for skill in required_skills if skill not in candidate_skills]

    skills_component = min(45.0, _safe_pct(len(matched_skills), max(len(required_skills), 1)) * 0.45)

    candidate_exp = float(profile.total_experience_years or 0.0)
    required_exp = _extract_years(job.experience_required)
    if required_exp <= 0:
        experience_component = 14.0
    else:
        ratio = min(candidate_exp / required_exp, 1.2)
        experience_component = min(20.0, ratio * 20.0)

    jd_tokens = set(_tokenize(job.description) + _tokenize(getattr(job, "responsibilities", None)))
    profile_tokens = set(_tokenize(profile.bio) + [skill for skill in candidate_skills])
    keyword_overlap = len(jd_tokens.intersection(profile_tokens))
    keyword_base = max(len(jd_tokens), 1)
    keyword_component = min(15.0, _safe_pct(keyword_overlap, keyword_base) * 0.15)

    completion_component = min(10.0, float(profile.profile_completion_percentage or 0) * 0.10)

    certification_count = len(profile.certifications or [])
    education_count = len(profile.educations or [])
    quality_component = min(10.0, (certification_count * 2.5) + (education_count * 2.0))

    raw_score = skills_component + experience_component + keyword_component + completion_component + quality_component
    ats_score = int(round(max(0.0, min(100.0, raw_score))))

    strengths: list[str] = []
    improvements: list[str] = []

    if len(matched_skills) >= max(2, int(len(required_skills) * 0.6)):
        strengths.append("Strong skill alignment with this role")
    else:
        improvements.append("Add more role-specific technical keywords")

    if candidate_exp >= required_exp and required_exp > 0:
        strengths.append("Experience level meets or exceeds requirement")
    elif required_exp > 0:
        improvements.append(f"Target at least {required_exp:g}+ years experience evidence in resume")

    if float(profile.profile_completion_percentage or 0) >= 75:
        strengths.append("Profile is mostly complete for ATS parsing")
    else:
        improvements.append("Complete profile sections to improve ATS confidence")

    if keyword_overlap >= 10:
        strengths.append("Resume language overlaps well with job description")
    else:
        improvements.append("Mirror job-description language in summary and experience bullets")

    if missing_skills:
        top_missing = ", ".join(missing_skills[:5])
        improvements.append(f"Missing keywords: {top_missing}")

    verdict = "excellent_fit" if ats_score >= 80 else "good_fit" if ats_score >= 65 else "needs_improvement"

    return {
        "job_id": job.id,
        "job_title": job.title,
        "department": job.department,
        "location": job.location,
        "ats_score": ats_score,
        "verdict": verdict,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "score_breakdown": {
            "skills_match": round(skills_component, 2),
            "experience_fit": round(experience_component, 2),
            "keyword_relevance": round(keyword_component, 2),
            "profile_completeness": round(completion_component, 2),
            "education_certifications": round(quality_component, 2),
        },
        "insights": {
            "strengths": strengths[:4],
            "improvements": improvements[:5],
        },
    }


def _enrich_results_with_gemini(results: list[dict], jobs_by_id: dict[int, Job]) -> None:
    if not _gemini_enabled() or not results:
        return

    top_n = int(os.getenv("GEMINI_ATS_TOP_N", "3") or "3")
    for result in results[:max(1, top_n)]:
        job = jobs_by_id.get(result["job_id"])
        if not job:
            continue
        enhanced = _gemini_insights(
            job_title=job.title,
            job_description=job.description,
            required_skills=job.required_skills or [],
            matched_skills=result.get("matched_skills", []),
            missing_skills=result.get("missing_skills", []),
            current_score=result.get("ats_score", 0),
        )
        if enhanced:
            result["insights"] = enhanced


def build_candidate_ats_snapshot(db: Session, candidate_user_id: int, job_id: int | None = None) -> dict:
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == candidate_user_id).first()
    if not profile:
        raise ValueError("Candidate profile not found")

    query = db.query(Job).filter(Job.is_active == True)  # noqa: E712
    if job_id is not None:
        query = query.filter(Job.id == job_id)

    jobs = query.order_by(Job.created_at.desc()).all()
    results = [score_job_fit(profile, job) for job in jobs]
    results.sort(key=lambda item: item["ats_score"], reverse=True)
    jobs_by_id = {job.id: job for job in jobs}
    _enrich_results_with_gemini(results, jobs_by_id)

    avg_score = int(round(sum(item["ats_score"] for item in results) / max(len(results), 1))) if results else 0
    top_recommendations = [item["job_title"] for item in results if item["ats_score"] >= 65][:5]

    return {
        "candidate_id": candidate_user_id,
        "average_score": avg_score,
        "total_jobs_evaluated": len(results),
        "top_recommendations": top_recommendations,
        "results": results,
    }
