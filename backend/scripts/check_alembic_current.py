import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


def main() -> None:
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")
    cfg = Config("alembic.ini")
    print("== Alembic current ==")
    command.current(cfg, verbose=True)

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found")
        return

    url = make_url(database_url)
    if "pgbouncer" in url.query:
        filtered_query = {k: v for k, v in url.query.items() if k != "pgbouncer"}
        url = url.set(query=filtered_query)

    connect_args = {"sslmode": "require"} if "supabase.co" in str(url) else {}
    engine = create_engine(url.render_as_string(hide_password=False), connect_args=connect_args)

    print("== alembic_version table ==")
    with engine.connect() as connection:
        rows = connection.execute(text("SELECT version_num FROM alembic_version")).fetchall()
        if not rows:
            print("alembic_version table exists but is empty")
        else:
            for row in rows:
                print(row[0])

        print("== jobs table columns ==")
        job_columns = connection.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'jobs'
                ORDER BY ordinal_position
                """
            )
        ).fetchall()
        for row in job_columns:
            print(row[0])


if __name__ == "__main__":
    main()
