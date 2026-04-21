import os
import re
from typing import Any

from docx import Document
from pypdf import PdfReader


COMMON_SKILLS = {
    "python", "java", "javascript", "typescript", "react", "node", "node.js", "express", "django",
    "fastapi", "flask", "sql", "postgresql", "mysql", "mongodb", "redis", "aws", "azure", "gcp",
    "docker", "kubernetes", "terraform", "linux", "git", "github", "ci/cd", "jenkins", "spark",
    "hadoop", "machine learning", "deep learning", "nlp", "pandas", "numpy", "scikit-learn", "tableau",
    "power bi", "figma", "ux", "ui", "go", "golang", "c++", "c#", ".net", "graphql", "rest",
}


def resolve_upload_dir() -> str:
    configured = os.getenv("UPLOAD_DIR")
    if configured:
        return os.path.abspath(configured)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    return os.path.join(base_dir, "uploads")


def storage_path_from_url(file_url: str) -> str:
    upload_dir = resolve_upload_dir()
    if not file_url:
        return ""

    cleaned = file_url.replace("\\", "/")
    if "/uploads/" in cleaned:
        relative = cleaned.split("/uploads/", 1)[1]
    else:
        relative = cleaned.lstrip("/")
    return os.path.join(upload_dir, *relative.split("/"))


def _extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    chunks: list[str] = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks).strip()


def _extract_text_from_docx(file_path: str) -> str:
    doc = Document(file_path)
    chunks = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    return "\n".join(chunks).strip()


def _extract_text_from_doc(file_path: str) -> str:
    # Basic fallback for .doc files where robust parsing tool may be unavailable.
    with open(file_path, "rb") as handle:
        raw = handle.read()
    return raw.decode("utf-8", errors="ignore").strip()


def extract_text_from_file(file_path: str) -> str:
    if not file_path or not os.path.exists(file_path):
        return ""

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return _extract_text_from_pdf(file_path)
    if ext == ".docx":
        return _extract_text_from_docx(file_path)
    if ext == ".doc":
        return _extract_text_from_doc(file_path)

    with open(file_path, "r", encoding="utf-8", errors="ignore") as handle:
        return handle.read().strip()


def _normalize_token(token: str) -> str:
    return token.strip().lower()


def _extract_skill_hits(text: str) -> list[str]:
    lowered = text.lower()
    hits = [skill for skill in COMMON_SKILLS if skill in lowered]
    return sorted(set(hits))


def _extract_experience_years(text: str) -> float:
    patterns = [
        r"(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs)\b",
        r"experience\s*[:\-]?\s*(\d+(?:\.\d+)?)",
    ]
    values: list[float] = []
    for pattern in patterns:
        for match in re.findall(pattern, text, flags=re.IGNORECASE):
            try:
                values.append(float(match))
            except ValueError:
                continue
    return max(values) if values else 0.0


def extract_resume_signals(text: str) -> dict[str, Any]:
    normalized = (text or "").strip()
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]
    summary = " ".join(lines[:4])[:500] if lines else ""

    return {
        "text": normalized,
        "skills": _extract_skill_hits(normalized),
        "experience_years": _extract_experience_years(normalized),
        "summary": summary,
    }


def _infer_title(lines: list[str]) -> str | None:
    if not lines:
        return None
    first = lines[0]
    if 2 <= len(first.split()) <= 8:
        return first[:120]
    return None


def _infer_experience_required(text: str) -> str | None:
    match = re.search(r"(\d+(?:\.\d+)?)\s*\+?\s*(years|yrs)", text, flags=re.IGNORECASE)
    if not match:
        return None
    return f"{match.group(1)}+ years"


def extract_job_signals(text: str) -> dict[str, Any]:
    normalized = (text or "").strip()
    lines = [line.strip() for line in normalized.splitlines() if line.strip()]

    return {
        "title": _infer_title(lines),
        "description": normalized[:4000],
        "required_skills": _extract_skill_hits(normalized)[:20],
        "experience_required": _infer_experience_required(normalized),
        "responsibilities": normalized[:2000],
    }