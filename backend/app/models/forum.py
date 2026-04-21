"""Forum models.
Four tables: categories, threads, posts, upvotes, reports.
All in one file since they are tightly related.
"""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, and_
from sqlalchemy.orm import relationship

from app.db.base import Base


class ForumCategory(Base):
    """
    Top-level topic grouping for threads.
    Pre-seeded by admin. Candidates cannot create categories.
    """

    __tablename__ = "forum_categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(300), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), nullable=True)
    thread_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    threads = relationship("ForumThread", back_populates="category")


class ForumThread(Base):
    """
    A discussion thread inside a category.
    Any authenticated user can create threads.
    """

    __tablename__ = "forum_threads"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("forum_categories.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    body = Column(String(5000), nullable=False)
    is_pinned = Column(Boolean, default=False)
    is_locked = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    reply_count = Column(Integer, default=0)
    upvote_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("ForumCategory", back_populates="threads")
    author = relationship("User")
    posts = relationship("ForumPost", back_populates="thread", cascade="all, delete-orphan")
    reports = relationship(
        "ForumReport",
        primaryjoin=lambda: and_(ForumThread.id == ForumReport.thread_id, ForumReport.post_id.is_(None)),
        viewonly=True,
    )


class ForumPost(Base):
    """A reply post inside a thread."""

    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True)
    thread_id = Column(Integer, ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body = Column(String(3000), nullable=False)
    is_flagged = Column(Boolean, default=False)
    upvote_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    thread = relationship("ForumThread", back_populates="posts")
    author = relationship("User")
    reports = relationship(
        "ForumReport",
        primaryjoin=lambda: and_(ForumPost.id == ForumReport.post_id, ForumReport.thread_id.is_(None)),
        viewonly=True,
    )


class ForumUpvote(Base):
    """
    Tracks upvotes. Prevents double voting per user.
    Exactly one of thread_id or post_id is set per row.
    """

    __tablename__ = "forum_upvotes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(Integer, ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "thread_id", name="uq_upvote_user_thread"),
        UniqueConstraint("user_id", "post_id", name="uq_upvote_user_post"),
        CheckConstraint(
            "(thread_id IS NOT NULL AND post_id IS NULL) OR (thread_id IS NULL AND post_id IS NOT NULL)",
            name="ck_upvote_thread_or_post",
        ),
    )


class ForumReport(Base):
    """User report on a thread or post for admin moderation."""

    __tablename__ = "forum_reports"

    id = Column(Integer, primary_key=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    thread_id = Column(Integer, ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=True)
    reason = Column(String(500), nullable=False)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint(
            "(thread_id IS NOT NULL AND post_id IS NULL) OR (thread_id IS NULL AND post_id IS NOT NULL)",
            name="ck_report_thread_or_post",
        ),
    )
