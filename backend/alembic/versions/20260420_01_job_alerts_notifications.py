"""add job alerts and notifications tables

Revision ID: 20260420_01_job_alerts_notifications
Revises: 
Create Date: 2026-04-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260420_01_job_alerts_notifications"
down_revision = "52be78655951"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_alerts",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role_keywords", sa.JSON(), nullable=False),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("min_salary", sa.Integer(), nullable=True),
        sa.Column("max_experience", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("last_triggered_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_job_alerts_candidate_id", "job_alerts", ["candidate_id"])

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(), nullable=False, server_default=sa.text("'job_alert'")),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.String(), nullable=False),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id"), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_job_id", "notifications", ["job_id"])


def downgrade() -> None:
    op.drop_index("ix_notifications_job_id", table_name="notifications")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")

    op.drop_index("ix_job_alerts_candidate_id", table_name="job_alerts")
    op.drop_table("job_alerts")
