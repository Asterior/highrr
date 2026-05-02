"""add employer verification levels and company manual verification fields

Revision ID: 20260428_01_employer_verification_levels
Revises: 143548b56978
Create Date: 2026-04-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260428_01_employer_verification_levels'
down_revision = '143548b56978'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'employer_verifications',
        sa.Column('trust_score', sa.Integer(), server_default='0', nullable=False),
    )
    op.add_column(
        'employer_verifications',
        sa.Column('verification_level', sa.String(length=20), server_default='unverified', nullable=False),
    )

    op.add_column(
        'company_verifications',
        sa.Column('gst_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.add_column(
        'company_verifications',
        sa.Column('email_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.add_column(
        'company_verifications',
        sa.Column('website_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.add_column(
        'company_verifications',
        sa.Column('linkedin_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )
    op.add_column(
        'company_verifications',
        sa.Column('gst_certificate_url', sa.String(length=500), nullable=True),
    )
    op.add_column(
        'company_verifications',
        sa.Column('business_proof_url', sa.String(length=500), nullable=True),
    )
    op.add_column(
        'company_verifications',
        sa.Column('kyc_status', sa.String(length=20), server_default='pending', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('company_verifications', 'kyc_status')
    op.drop_column('company_verifications', 'business_proof_url')
    op.drop_column('company_verifications', 'gst_certificate_url')
    op.drop_column('company_verifications', 'linkedin_verified')
    op.drop_column('company_verifications', 'website_verified')
    op.drop_column('company_verifications', 'email_verified')
    op.drop_column('company_verifications', 'gst_verified')

    op.drop_column('employer_verifications', 'verification_level')
    op.drop_column('employer_verifications', 'trust_score')
