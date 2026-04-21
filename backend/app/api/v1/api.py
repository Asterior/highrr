"""API router aggregation for version 1 endpoints."""

from fastapi import APIRouter

from app.api.v1.endpoints.alerts import alerts_router, notifications_router
from app.api.v1.endpoints.forum import router as forum_router

api_router = APIRouter()
api_router.include_router(alerts_router, tags=["alerts"])
api_router.include_router(notifications_router, tags=["notifications"])
api_router.include_router(forum_router, prefix="/forum", tags=["forum"])
