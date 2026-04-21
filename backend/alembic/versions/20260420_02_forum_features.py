"""add community forum tables

Revision ID: 20260420_02_forum_features
Revises: 20260420_01_job_alerts_notifications
Create Date: 2026-04-20 00:00:00.000001
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260420_02_forum_features"
down_revision = "20260420_01_job_alerts_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "forum_categories",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False, unique=True),
        sa.Column("description", sa.String(length=300), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False, unique=True),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("thread_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "forum_threads",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("forum_categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.String(length=5000), nullable=False),
        sa.Column("is_pinned", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("is_locked", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("is_flagged", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("view_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("reply_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("upvote_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_forum_threads_category_id", "forum_threads", ["category_id"])
    op.create_index("ix_forum_threads_author_id", "forum_threads", ["author_id"])

    op.create_table(
        "forum_posts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("thread_id", sa.Integer(), sa.ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.String(length=3000), nullable=False),
        sa.Column("is_flagged", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("upvote_count", sa.Integer(), nullable=True, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_forum_posts_thread_id", "forum_posts", ["thread_id"])
    op.create_index("ix_forum_posts_author_id", "forum_posts", ["author_id"])

    op.create_table(
        "forum_upvotes",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("thread_id", sa.Integer(), sa.ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "(thread_id IS NOT NULL AND post_id IS NULL) OR (thread_id IS NULL AND post_id IS NOT NULL)",
            name="ck_upvote_thread_or_post",
        ),
        sa.UniqueConstraint("user_id", "thread_id", name="uq_upvote_user_thread"),
        sa.UniqueConstraint("user_id", "post_id", name="uq_upvote_user_post"),
    )
    op.create_index("ix_forum_upvotes_user_id", "forum_upvotes", ["user_id"])

    op.create_table(
        "forum_reports",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("reporter_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("thread_id", sa.Integer(), sa.ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=True),
        sa.Column("reason", sa.String(length=500), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "(thread_id IS NOT NULL AND post_id IS NULL) OR (thread_id IS NULL AND post_id IS NOT NULL)",
            name="ck_report_thread_or_post",
        ),
    )
    op.create_index("ix_forum_reports_reporter_id", "forum_reports", ["reporter_id"])


def downgrade() -> None:
    op.drop_index("ix_forum_reports_reporter_id", table_name="forum_reports")
    op.drop_table("forum_reports")

    op.drop_index("ix_forum_upvotes_user_id", table_name="forum_upvotes")
    op.drop_table("forum_upvotes")

    op.drop_index("ix_forum_posts_author_id", table_name="forum_posts")
    op.drop_index("ix_forum_posts_thread_id", table_name="forum_posts")
    op.drop_table("forum_posts")

    op.drop_index("ix_forum_threads_author_id", table_name="forum_threads")
    op.drop_index("ix_forum_threads_category_id", table_name="forum_threads")
    op.drop_table("forum_threads")

    op.drop_table("forum_categories")