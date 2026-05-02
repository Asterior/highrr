"""Pydantic schemas for all forum endpoints."""

from datetime import datetime

from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str
    slug: str
    icon: str | None
    thread_count: int

    class Config:
        from_attributes = True


class ThreadCreate(BaseModel):
    category_id: int
    title: str
    body: str


class ThreadListItem(BaseModel):
    id: int
    author_id: int
    title: str
    author_name: str
    author_role: str
    category_name: str
    category_slug: str | None = None
    is_pinned: bool
    is_locked: bool
    is_flagged: bool
    view_count: int
    reply_count: int
    upvote_count: int
    created_at: datetime
    updated_at: datetime
    is_upvoted: bool | None = None

    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: int
    thread_id: int
    author_id: int
    author_name: str
    author_role: str
    body: str
    upvote_count: int
    created_at: datetime
    updated_at: datetime
    is_upvoted: bool | None = None

    class Config:
        from_attributes = True


class ThreadDetailResponse(BaseModel):
    id: int
    author_id: int
    title: str
    body: str
    author_name: str
    author_role: str
    category_name: str
    category_slug: str | None = None
    is_pinned: bool
    is_locked: bool
    is_flagged: bool
    view_count: int
    reply_count: int
    upvote_count: int
    created_at: datetime
    updated_at: datetime
    posts: list[PostResponse]
    is_upvoted: bool | None = None

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    thread_id: int
    body: str


class ThreadUpdate(BaseModel):
    title: str | None = None
    body: str | None = None


class PostUpdate(BaseModel):
    body: str


class UpvoteRequest(BaseModel):
    thread_id: int | None = None
    post_id: int | None = None


class UpvoteResponse(BaseModel):
    upvoted: bool
    upvote_count: int


class ForumReportCreate(BaseModel):
    thread_id: int | None = None
    post_id: int | None = None
    reason: str


class PaginatedThreads(BaseModel):
    items: list[ThreadListItem]
    total: int
    page: int
    pages: int


class ModerationItem(BaseModel):
    type: str
    id: int
    content_preview: str
    author_name: str
    report_count: int
    reasons: list[str]
    report_ids: list[int] = []
    created_at: datetime
