"""
Alembic migration environment.

To generate a new migration after model changes:
  alembic revision --autogenerate -m "describe_your_change"

To apply all pending migrations:
  alembic upgrade head

To roll back one migration:
  alembic downgrade -1

To see current migration status:
  alembic current
"""

from logging.config import fileConfig
import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

load_dotenv()

from app.db.base import Base
from app.models import admin_test, application, candidate_profile, company_verification, conversation, employer_verification, forum, interview, job, job_alert, message, notification, recruiter_reputation, user, user_report

config = context.config
database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL is required for Alembic")

parsed_url = urlsplit(database_url)
filtered_query = urlencode([(key, value) for key, value in parse_qsl(parsed_url.query, keep_blank_values=True) if key.lower() != "pgbouncer"])
normalized_database_url = urlunsplit(parsed_url._replace(query=filtered_query))

config.set_main_option("sqlalchemy.url", normalized_database_url.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Runs migrations in offline mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Runs migrations in online mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
