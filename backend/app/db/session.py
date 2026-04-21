import os
from pathlib import Path

from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

# Load environment variables from backend/.env regardless of current working directory
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")

# Get DATABASE_URL from .env
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

url = make_url(DATABASE_URL)
if "pgbouncer" in url.query:
    filtered_query = {k: v for k, v in url.query.items() if k != "pgbouncer"}
    url = url.set(query=filtered_query)
DATABASE_URL = url.render_as_string(hide_password=False)

connect_args = {"sslmode": "require"} if "supabase.co" in DATABASE_URL else {}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)

# Create session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()