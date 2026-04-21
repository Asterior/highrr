"""Forum service layer.
All business logic for categories, threads, posts, moderation.
No HTTP concerns. No FastAPI imports.
Raises ValueError for all business rule violations.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.constants import FORUM_MAX_POSTS_PER_HOUR, FORUM_MAX_THREADS_PER_DAY, FORUM_REPORT_AUTO_FLAG_THRESHOLD
from app.core.sanitize import sanitize_string
from app.models.forum import ForumCategory, ForumPost, ForumReport, ForumThread, ForumUpvote
from app.models.user import User


def _author_payload(author: User) -> dict:
    return {"author_name": author.name, "author_role": author.role}


def _thread_payload(thread: ForumThread, *, upvoted: bool | None = None) -> dict:
    payload = {
        "id": thread.id,
        "title": thread.title,
        "body": thread.body,
        "author_name": thread.author.name if thread.author else "Unknown",
        "author_role": thread.author.role if thread.author else "candidate",
        "category_name": thread.category.name if thread.category else "",
        "category_slug": thread.category.slug if thread.category else None,
        "is_pinned": bool(thread.is_pinned),
        "is_locked": bool(thread.is_locked),
        "is_flagged": bool(thread.is_flagged),
        "view_count": thread.view_count or 0,
        "reply_count": thread.reply_count or 0,
        "upvote_count": thread.upvote_count or 0,
        "created_at": thread.created_at,
        "is_upvoted": upvoted,
    }
    return payload


def _post_payload(post: ForumPost, *, upvoted: bool | None = None) -> dict:
    return {
        "id": post.id,
        "thread_id": post.thread_id,
        "author_name": post.author.name if post.author else "Unknown",
        "author_role": post.author.role if post.author else "candidate",
        "body": post.body,
        "upvote_count": post.upvote_count or 0,
        "created_at": post.created_at,
        "is_upvoted": upvoted,
    }


def get_categories(db: Session) -> list[dict]:
    """Returns all ForumCategory records ordered by name.
    Uses no joins — thread_count is a stored counter.
    """
    categories = db.query(ForumCategory).order_by(ForumCategory.name.asc()).all()
    return [
        {
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "slug": category.slug,
            "icon": category.icon,
            "thread_count": category.thread_count or 0,
        }
        for category in categories
    ]


def get_threads(category_slug: str, page: int, page_size: int, db: Session, viewer_id: int | None = None) -> dict:
    """Returns paginated threads for the given category slug.
    Excludes is_flagged = True threads entirely.
    Pinned threads (is_pinned = True) always appear first regardless of page number.
    Remaining threads ordered by created_at desc.
    Uses joinedload for author and category.
    Returns: paginated thread dict.
    Raises ValueError "Category not found" if slug invalid.
    """
    category = db.query(ForumCategory).filter(ForumCategory.slug == category_slug).first()
    if not category:
        raise ValueError("Category not found")

    page = max(1, int(page or 1))
    page_size = max(1, min(int(page_size or 20), 50))
    base_query = (
        db.query(ForumThread)
        .options(joinedload(ForumThread.author), joinedload(ForumThread.category))
        .filter(ForumThread.category_id == category.id, ForumThread.is_flagged == False)  # noqa: E712
    )
    total = base_query.count()
    pages = max(1, (total + page_size - 1) // page_size) if total else 0

    threads = (
        base_query.order_by(ForumThread.is_pinned.desc(), ForumThread.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    upvoted_thread_ids: set[int] = set()
    if viewer_id is not None and threads:
        thread_ids = [thread.id for thread in threads]
        voted_threads = (
            db.query(ForumUpvote.thread_id)
            .filter(ForumUpvote.user_id == viewer_id, ForumUpvote.thread_id.in_(thread_ids))
            .all()
        )
        upvoted_thread_ids = {row[0] for row in voted_threads if row[0] is not None}

    items = [_thread_payload(thread, upvoted=thread.id in upvoted_thread_ids) for thread in threads]
    return {"items": items, "total": total, "page": page, "pages": pages}


def get_thread_detail(thread_id: int, db: Session, viewer_id: int | None = None) -> dict:
    """Returns full thread with posts.
    Increments view_count by 1 on every call.
    Excludes posts where is_flagged = True.
    Posts ordered by created_at asc (chronological).
    Uses joinedload for author, selectinload for posts with joinedload for each post's author.
    Raises ValueError "Thread not found" if invalid.
    """
    thread = (
        db.query(ForumThread)
        .options(
            joinedload(ForumThread.author),
            joinedload(ForumThread.category),
            selectinload(ForumThread.posts).joinedload(ForumPost.author),
        )
        .filter(ForumThread.id == thread_id)
        .first()
    )
    if not thread:
        raise ValueError("Thread not found")

    thread.view_count = (thread.view_count or 0) + 1
    db.commit()
    db.refresh(thread)

    posts = [post for post in sorted(thread.posts, key=lambda item: item.created_at or datetime.utcnow()) if not post.is_flagged]
    thread_upvoted = False
    if viewer_id is not None:
        thread_upvoted = (
            db.query(ForumUpvote)
            .filter(ForumUpvote.user_id == viewer_id, ForumUpvote.thread_id == thread.id)
            .first()
            is not None
        )

    post_upvoted_ids: set[int] = set()
    if viewer_id is not None and posts:
        post_ids = [post.id for post in posts]
        voted_posts = (
            db.query(ForumUpvote.post_id)
            .filter(ForumUpvote.user_id == viewer_id, ForumUpvote.post_id.in_(post_ids))
            .all()
        )
        post_upvoted_ids = {row[0] for row in voted_posts if row[0] is not None}

    return {
        **_thread_payload(thread, upvoted=thread_upvoted),
        "posts": [_post_payload(post, upvoted=post.id in post_upvoted_ids) for post in posts],
    }


def create_thread(author_id: int, category_id: int, title: str, body: str, db: Session) -> dict:
    """Creates a new forum thread.
    Sanitizes title and body via sanitize_string().
    Validates title and body lengths.
    Spam check against FORUM_MAX_THREADS_PER_DAY.
    Increments category.thread_count by 1.
    Returns thread dict with author_name and author_role.
    Raises ValueError "Category not found" if invalid.
    """
    category = db.query(ForumCategory).filter(ForumCategory.id == category_id).first()
    if not category:
        raise ValueError("Category not found")

    clean_title = sanitize_string(title, 200)
    clean_body = sanitize_string(body, 5000)
    if len(clean_title) < 10:
        raise ValueError("Title too short")
    if len(clean_body) < 20:
        raise ValueError("Body too short")

    window_start = datetime.utcnow() - timedelta(days=1)
    recent_count = (
        db.query(ForumThread)
        .filter(ForumThread.author_id == author_id, ForumThread.created_at >= window_start)
        .count()
    )
    if recent_count >= FORUM_MAX_THREADS_PER_DAY:
        raise ValueError(f"Thread limit reached. Max {FORUM_MAX_THREADS_PER_DAY} threads per day.")

    author = db.query(User).filter(User.id == author_id).first()
    thread = ForumThread(category_id=category_id, author_id=author_id, title=clean_title, body=clean_body)
    db.add(thread)
    category.thread_count = (category.thread_count or 0) + 1
    db.commit()
    db.refresh(thread)
    thread = (
        db.query(ForumThread)
        .options(joinedload(ForumThread.author), joinedload(ForumThread.category))
        .filter(ForumThread.id == thread.id)
        .first()
    )
    return _thread_payload(thread, upvoted=False)


def create_post(author_id: int, thread_id: int, body: str, db: Session) -> dict:
    """Creates a reply post.
    Sanitizes body via sanitize_string().
    Validates body length.
    Raises ValueError "Thread is locked" if thread.is_locked.
    Spam check against FORUM_MAX_POSTS_PER_HOUR.
    Increments thread.reply_count by 1.
    Returns post dict with author_name and author_role.
    """
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise ValueError("Thread not found")
    if thread.is_locked:
        raise ValueError("Thread is locked")

    clean_body = sanitize_string(body, 3000)
    if len(clean_body) < 5:
        raise ValueError("Body too short")

    window_start = datetime.utcnow() - timedelta(hours=1)
    recent_count = (
        db.query(ForumPost)
        .filter(ForumPost.author_id == author_id, ForumPost.created_at >= window_start)
        .count()
    )
    if recent_count >= FORUM_MAX_POSTS_PER_HOUR:
        raise ValueError(f"Post limit reached. Max {FORUM_MAX_POSTS_PER_HOUR} posts per hour.")

    post = ForumPost(author_id=author_id, thread_id=thread_id, body=clean_body)
    db.add(post)
    thread.reply_count = (thread.reply_count or 0) + 1
    db.commit()
    db.refresh(post)
    post = (
        db.query(ForumPost)
        .options(joinedload(ForumPost.author), joinedload(ForumPost.thread))
        .filter(ForumPost.id == post.id)
        .first()
    )
    return _post_payload(post, upvoted=False)


def toggle_upvote(user_id: int, thread_id: int | None, post_id: int | None, db: Session) -> dict:
    """Adds upvote if not present, removes if present (toggle).
    Exactly one of thread_id or post_id must be non-None.
    Raises ValueError for invalid state or own-content upvote.
    Returns dict with upvoted and upvote_count.
    """
    if (thread_id is None and post_id is None) or (thread_id is not None and post_id is not None):
        raise ValueError("Provide thread_id or post_id, not both")

    if thread_id is not None:
        thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
        if not thread:
            raise ValueError("Thread not found")
        if thread.author_id == user_id:
            raise ValueError("Cannot upvote your own content")

        existing = (
            db.query(ForumUpvote)
            .filter(ForumUpvote.user_id == user_id, ForumUpvote.thread_id == thread_id)
            .first()
        )
        if existing:
            db.delete(existing)
            thread.upvote_count = max(0, (thread.upvote_count or 0) - 1)
            db.commit()
            return {"upvoted": False, "upvote_count": thread.upvote_count or 0}

        db.add(ForumUpvote(user_id=user_id, thread_id=thread_id))
        thread.upvote_count = (thread.upvote_count or 0) + 1
        db.commit()
        return {"upvoted": True, "upvote_count": thread.upvote_count or 0}

    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise ValueError("Post not found")
    if post.author_id == user_id:
        raise ValueError("Cannot upvote your own content")

    existing = (
        db.query(ForumUpvote)
        .filter(ForumUpvote.user_id == user_id, ForumUpvote.post_id == post_id)
        .first()
    )
    if existing:
        db.delete(existing)
        post.upvote_count = max(0, (post.upvote_count or 0) - 1)
        db.commit()
        return {"upvoted": False, "upvote_count": post.upvote_count or 0}

    db.add(ForumUpvote(user_id=user_id, post_id=post_id))
    post.upvote_count = (post.upvote_count or 0) + 1
    db.commit()
    return {"upvoted": True, "upvote_count": post.upvote_count or 0}


def report_content(reporter_id: int, thread_id: int | None, post_id: int | None, reason: str, db: Session) -> bool:
    """Creates a ForumReport record.
    Raises ValueError "Provide thread_id or post_id, not both" if both provided.
    Returns False when unresolved report already exists for this reporter/content pair.
    After creating report: count total unresolved reports on this content.
    If count >= FORUM_REPORT_AUTO_FLAG_THRESHOLD, set is_flagged = True.
    """
    if (thread_id is None and post_id is None) or (thread_id is not None and post_id is not None):
        raise ValueError("Provide thread_id or post_id, not both")

    clean_reason = sanitize_string(reason, 500)
    if len(clean_reason) < 10:
        raise ValueError("Reason too short")

    if thread_id is not None:
        thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
        if not thread:
            raise ValueError("Thread not found")

        existing = (
            db.query(ForumReport)
            .filter(
                ForumReport.reporter_id == reporter_id,
                ForumReport.thread_id == thread_id,
                ForumReport.resolved == False,  # noqa: E712
            )
            .first()
        )
        if existing:
            return False

        db.add(ForumReport(reporter_id=reporter_id, thread_id=thread_id, reason=clean_reason))
        db.commit()
        unresolved_count = (
            db.query(ForumReport)
            .filter(ForumReport.thread_id == thread_id, ForumReport.resolved == False)  # noqa: E712
            .count()
        )
        if unresolved_count >= FORUM_REPORT_AUTO_FLAG_THRESHOLD:
            thread.is_flagged = True
            db.commit()
        return True

    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise ValueError("Post not found")

    existing = (
        db.query(ForumReport)
        .filter(
            ForumReport.reporter_id == reporter_id,
            ForumReport.post_id == post_id,
            ForumReport.resolved == False,  # noqa: E712
        )
        .first()
    )
    if existing:
        return False

    db.add(ForumReport(reporter_id=reporter_id, post_id=post_id, reason=clean_reason))
    db.commit()
    unresolved_count = (
        db.query(ForumReport)
        .filter(ForumReport.post_id == post_id, ForumReport.resolved == False)  # noqa: E712
        .count()
    )
    if unresolved_count >= FORUM_REPORT_AUTO_FLAG_THRESHOLD:
        post.is_flagged = True
        db.commit()
    return True


def admin_lock_thread(thread_id: int, db: Session) -> None:
    """Sets is_locked = True on thread.
    Raises ValueError "Thread not found" if invalid.
    """
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise ValueError("Thread not found")
    thread.is_locked = True
    db.commit()


def admin_delete_thread(thread_id: int, db: Session) -> None:
    """Hard deletes thread. Cascade deletes all posts via ORM.
    Decrements category.thread_count by 1.
    Raises ValueError "Thread not found" if invalid.
    """
    thread = db.query(ForumThread).filter(ForumThread.id == thread_id).first()
    if not thread:
        raise ValueError("Thread not found")
    category = db.query(ForumCategory).filter(ForumCategory.id == thread.category_id).first()
    if category:
        category.thread_count = max(0, (category.thread_count or 0) - 1)
    db.delete(thread)
    db.commit()


def admin_delete_post(post_id: int, db: Session) -> None:
    """Hard deletes a single post.
    Decrements parent thread.reply_count by 1.
    Raises ValueError "Post not found" if invalid.
    """
    post = db.query(ForumPost).filter(ForumPost.id == post_id).first()
    if not post:
        raise ValueError("Post not found")
    thread = db.query(ForumThread).filter(ForumThread.id == post.thread_id).first()
    if thread:
        thread.reply_count = max(0, (thread.reply_count or 0) - 1)
    db.delete(post)
    db.commit()


def admin_resolve_report(report_id: int, db: Session) -> None:
    """Sets resolved = True on the report.
    Raises ValueError "Report not found" if invalid.
    """
    report = db.query(ForumReport).filter(ForumReport.id == report_id).first()
    if not report:
        raise ValueError("Report not found")
    report.resolved = True
    db.commit()


def get_moderation_queue(db: Session) -> list[dict]:
    """Returns all flagged threads and flagged posts.
    For each flagged item includes type, id, preview, author_name, report_count, reasons, created_at.
    Ordered by created_at asc (oldest first).
    Uses selectinload for reports.
    """
    thread_items = (
        db.query(ForumThread)
        .options(joinedload(ForumThread.author), selectinload(ForumThread.reports))
        .filter(ForumThread.is_flagged == True)  # noqa: E712
        .all()
    )
    post_items = (
        db.query(ForumPost)
        .options(joinedload(ForumPost.author), selectinload(ForumPost.reports))
        .filter(ForumPost.is_flagged == True)  # noqa: E712
        .all()
    )

    queue: list[dict] = []
    for thread in thread_items:
        reports = [report for report in thread.reports if not report.resolved]
        queue.append(
            {
                "type": "thread",
                "id": thread.id,
                "content_preview": (thread.body or "")[:100],
                "author_name": thread.author.name if thread.author else "Unknown",
                "report_count": len(reports),
                "reasons": [report.reason for report in reports],
                "report_ids": [report.id for report in reports],
                "created_at": thread.created_at,
            }
        )

    for post in post_items:
        reports = [report for report in post.reports if not report.resolved]
        queue.append(
            {
                "type": "post",
                "id": post.id,
                "content_preview": (post.body or "")[:100],
                "author_name": post.author.name if post.author else "Unknown",
                "report_count": len(reports),
                "reasons": [report.reason for report in reports],
                "report_ids": [report.id for report in reports],
                "created_at": post.created_at,
            }
        )

    return sorted(queue, key=lambda item: item["created_at"])


def seed_default_categories(db: Session) -> None:
    """Seeds default forum categories if none exist.
    Call this once from main.py startup in development.
    """
    if db.query(ForumCategory).count() > 0:
        return

    categories = [
        ForumCategory(
            name="FAANG Prep",
            slug="faang-prep",
            icon="target",
            description="Tips, experiences and strategies for cracking top tech companies",
        ),
        ForumCategory(
            name="Salary Negotiation",
            slug="salary-negotiation",
            icon="trending-up",
            description="Scripts, strategies and real numbers for negotiating your offer",
        ),
        ForumCategory(
            name="Remote Work India",
            slug="remote-work-india",
            icon="globe",
            description="Remote-first companies, WFH policies and opportunities in India",
        ),
        ForumCategory(
            name="Resume & Portfolio",
            slug="resume-portfolio",
            icon="file-text",
            description="Get feedback on your resume, LinkedIn, and portfolio",
        ),
        ForumCategory(
            name="Interview Experiences",
            slug="interview-experiences",
            icon="message-square",
            description="Share your interview experiences and help others prepare",
        ),
    ]
    db.add_all(categories)
    db.commit()
