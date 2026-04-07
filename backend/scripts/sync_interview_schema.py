from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from app.db.session import engine


def main():
    statements = [
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS mode VARCHAR DEFAULT 'online'",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS timezone VARCHAR",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_response_status VARCHAR DEFAULT 'pending'",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_response_reason TEXT",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS candidate_preferred_slots JSON DEFAULT '[]'",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS feedback_rating INTEGER",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS feedback_notes TEXT",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS recruiter_decision VARCHAR",
        "ALTER TABLE interviews ADD COLUMN IF NOT EXISTS status_history JSON DEFAULT '[]'",
    ]

    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))

    print("interviews schema synced")


if __name__ == "__main__":
    main()
