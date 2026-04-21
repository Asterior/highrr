"""Router for community forum endpoints."""

from fastapi import APIRouter, Depends, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.api.deps import get_admin, get_current_user
from app.core.errors import bad_request, not_found
from app.core.security import verify_access_token
from app.db.deps import get_db
from app.models.user import User
from app.schemas.forum import (
    CategoryResponse,
    ForumReportCreate,
    ModerationItem,
    PaginatedThreads,
    PostCreate,
    PostResponse,
    ThreadCreate,
    ThreadDetailResponse,
    UpvoteRequest,
    UpvoteResponse,
)
from app.services.forum_service import (
    admin_delete_post,
    admin_delete_thread,
    admin_lock_thread,
    admin_resolve_report,
    create_post,
    create_thread,
    get_categories,
    get_moderation_queue,
    get_thread_detail,
    get_threads,
    report_content,
    toggle_upvote,
)

router = APIRouter()
optional_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def _optional_current_user(token: str | None = Depends(optional_oauth2_scheme), db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None

    try:
        payload = verify_access_token(token)
        email = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None

    return db.query(User).filter(User.email == email).first()


@router.get("/categories", response_model=list[CategoryResponse])
def forum_categories(db: Session = Depends(get_db)):
    return get_categories(db)


@router.get("/categories/{slug}/threads", response_model=PaginatedThreads)
def forum_threads_by_category(
    slug: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(_optional_current_user),
):
    try:
        return get_threads(slug, page, min(page_size, 50), db, viewer_id=current_user.id if current_user else None)
    except ValueError:
        not_found("Category")


@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
def forum_thread_detail(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(_optional_current_user),
):
    try:
        return get_thread_detail(thread_id, db, viewer_id=current_user.id if current_user else None)
    except ValueError:
        not_found("Thread")


@router.post("/threads", response_model=ThreadDetailResponse, status_code=201)
def forum_create_thread(
    payload: ThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        thread = create_thread(current_user.id, payload.category_id, payload.title, payload.body, db)
        return get_thread_detail(thread["id"], db, viewer_id=current_user.id)
    except ValueError as exc:
        bad_request(str(exc))


@router.post("/posts", response_model=PostResponse, status_code=201)
def forum_create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return create_post(current_user.id, payload.thread_id, payload.body, db)
    except ValueError as exc:
        bad_request(str(exc))


@router.post("/upvote", response_model=UpvoteResponse)
def forum_toggle_upvote(
    payload: UpvoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return toggle_upvote(current_user.id, payload.thread_id, payload.post_id, db)
    except ValueError as exc:
        bad_request(str(exc))


@router.post("/report", status_code=201)
def forum_report_content(
    payload: ForumReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        created = report_content(current_user.id, payload.thread_id, payload.post_id, payload.reason, db)
        if created:
            return {"message": "Report submitted"}
        return {"message": "Report already submitted"}
    except ValueError as exc:
        bad_request(str(exc))


@router.get("/moderation-queue", response_model=list[ModerationItem])
def forum_moderation_queue(current_user: User = Depends(get_admin), db: Session = Depends(get_db)):
    _ = current_user
    return get_moderation_queue(db)


@router.patch("/threads/{thread_id}/lock")
def forum_lock_thread(thread_id: int, current_user: User = Depends(get_admin), db: Session = Depends(get_db)):
    _ = current_user
    try:
        admin_lock_thread(thread_id, db)
        return {"message": "Thread locked"}
    except ValueError:
        not_found("Thread")


@router.delete("/threads/{thread_id}")
def forum_delete_thread(thread_id: int, current_user: User = Depends(get_admin), db: Session = Depends(get_db)):
    _ = current_user
    try:
        admin_delete_thread(thread_id, db)
        return {"message": "Thread deleted"}
    except ValueError:
        not_found("Thread")


@router.delete("/posts/{post_id}")
def forum_delete_post(post_id: int, current_user: User = Depends(get_admin), db: Session = Depends(get_db)):
    _ = current_user
    try:
        admin_delete_post(post_id, db)
        return {"message": "Post deleted"}
    except ValueError:
        not_found("Post")


@router.patch("/reports/{report_id}/resolve")
def forum_resolve_report(report_id: int, current_user: User = Depends(get_admin), db: Session = Depends(get_db)):
    _ = current_user
    try:
        admin_resolve_report(report_id, db)
        return {"message": "Report resolved"}
    except ValueError:
        not_found("Report")
