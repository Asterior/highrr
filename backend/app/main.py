"""Application entrypoint and middleware wiring for the Highrr backend API."""

import logging
import os
import time
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy.orm import Session

from app.api.v1.endpoints import applications
from app.api.v1.endpoints import analytics
from app.api.v1.api import api_router
from app.api.v1.endpoints import assistant
from app.api.v1.endpoints import auth
from app.api.v1.endpoints import candidate_profile as candidate_profile_routes
from app.api.v1.endpoints import file_upload
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import jobs
from app.api.v1.endpoints import messages
from app.api.v1.endpoints import tests
from app.api.v1.endpoints import trust
from app.api.v1.endpoints import websocket
from app.api.v1.endpoints import users
from app.core.ollama_client import OllamaClient
from app.core.constants import ALERT_ENGINE_INTERVAL_HOURS
from app.core.rate_limit import limiter
from app.db.deps import get_db
from app.db.session import check_db_connection
from apscheduler.schedulers.asyncio import AsyncIOScheduler

LOGGER = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

scheduler = AsyncIOScheduler()

# Schema managed by Alembic. Run: alembic upgrade head


def _parse_cors_origins() -> list[str]:
    """Parses comma-separated CORS origins from environment settings."""
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    raw = (os.getenv("CORS_ORIGINS") or "").strip()

    if environment == "production" and not raw:
        raise RuntimeError("CORS_ORIGINS must be explicitly set in production")

    if not raw:
        if environment == "development":
            return [
                "http://localhost:8080",
                "http://127.0.0.1:8080",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        return ["http://localhost:5173"]

    origins = [item.strip() for item in raw.split(",") if item.strip()]
    if environment == "production" and "*" in origins:
        raise RuntimeError("Wildcard CORS origin is not allowed in production")
    return origins


def _cors_origin_regex() -> str | None:
    """Allows localhost and private-network origins during development."""
    environment = os.getenv("ENVIRONMENT", "development").strip().lower()
    if environment != "development":
        return None

    return r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$"


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Runs startup and shutdown checks for infrastructure readiness."""
    environment = os.getenv("ENVIRONMENT", "development")
    secret = os.getenv("SECRET_KEY", "")
    ollama_base = os.getenv("OLLAMA_BASE_URL", "")
    model_name = os.getenv("QWEN_MODEL", "")

    if not check_db_connection():
        raise RuntimeError("Database connection failed on startup")

    ollama_reachable = False
    try:
        ollama_reachable = OllamaClient().health_check()
    except RuntimeError:
        ollama_reachable = False

    if not ollama_reachable:
        LOGGER.warning(
            "Ollama is not reachable at %s. AI features will be degraded until Ollama is available.",
            ollama_base,
        )

    LOGGER.info("✓ Environment: %s", environment)
    LOGGER.info("✓ Database: connected")
    if ollama_reachable:
        LOGGER.info("✓ Ollama: reachable at %s", ollama_base)
    else:
        LOGGER.warning("✗ Ollama unreachable at %s", ollama_base)
    LOGGER.info("✓ Model: %s", model_name)
    if len(secret) < 32:
        LOGGER.warning("✗ WARNING if SECRET_KEY looks weak (under 32 chars)")

    from app.db.session import SessionLocal
    from app.services.forum_service import seed_default_categories
    from app.services.alert_engine import run_scheduled_alert_scan

    if environment.strip().lower() == "development":
        db = SessionLocal()
        try:
            seed_default_categories(db)
            LOGGER.info("Forum categories seeded for development.")
        finally:
            db.close()

    def _run_alert_scan() -> None:
        db = SessionLocal()
        try:
            created = run_scheduled_alert_scan(db)
            LOGGER.info("Alert engine run created %s notifications", created)
        finally:
            db.close()

    scheduler.add_job(
        _run_alert_scan,
        trigger="interval",
        hours=ALERT_ENGINE_INTERVAL_HOURS,
        id="alert_scan",
        replace_existing=True,
    )
    scheduler.start()
    LOGGER.info("Alert engine scheduler started. Runs every %s hours.", ALERT_ENGINE_INTERVAL_HOURS)

    yield

    scheduler.shutdown(wait=False)
    LOGGER.info("Alert engine scheduler stopped.")


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Returns consistent payload when the API rate limit is exceeded."""
    _ = (request, exc)
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please wait before trying again."},
    )
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)

cors_origins = _parse_cors_origins()
cors_origin_regex = _cors_origin_regex()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def attach_user_and_request_logs(request: Request, call_next):
    """Attaches auth user when available and logs request metadata and latency."""
    start = time.perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000
        timestamp = datetime.utcnow().isoformat()
        message = f"[{timestamp}] {request.method} {request.url.path} -> {status_code} ({elapsed_ms:.2f}ms)"
        if status_code >= 500:
            LOGGER.error(message)
        elif status_code >= 400:
            LOGGER.warning(message)
        else:
            LOGGER.info(message)


app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(interviews.router, prefix="/interviews", tags=["Interviews"])
app.include_router(messages.router, tags=["Messages"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(candidate_profile_routes.router)
app.include_router(file_upload.router)
app.include_router(trust.router, prefix="/trust", tags=["Trust"])
app.include_router(websocket.router, tags=["WebSockets"])
app.include_router(tests.router)
app.include_router(assistant.router)
app.include_router(api_router)


@app.get("/")
def root():
    """Returns service status root response."""
    return {"message": "Highrr Employer Backend Running"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    """Returns DB connectivity status for local development only."""
    if os.getenv("ENVIRONMENT", "development") != "development":
        return {"detail": "Not available"}
    _ = db
    return {"msg": "DB connected"}
