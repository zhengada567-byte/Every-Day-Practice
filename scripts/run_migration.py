"""Apply SQL migrations from migrations/ folder.

Usage:
  py scripts/run_migration.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from db_util import get_database_url, split_sql

MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations"


def main() -> int:
    try:
        import psycopg
    except ImportError:
        print("Install psycopg: py -m pip install psycopg[binary]", file=sys.stderr)
        return 1

    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not files:
        print("No migration files found.", file=sys.stderr)
        return 1

    url = get_database_url()

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  version TEXT PRIMARY KEY,
                  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cur.execute("SELECT version FROM schema_migrations")
            applied = {row[0] for row in cur.fetchall()}

            for path in files:
                version = path.name
                if version in applied:
                    print(f"Skip (already applied): {version}")
                    continue
                sql = path.read_text(encoding="utf-8")
                # File may define schema_migrations; statements are idempotent where noted.
                for stmt in split_sql(sql):
                    upper = stmt.strip().upper()
                    if upper.startswith("CREATE TABLE IF NOT EXISTS SCHEMA_MIGRATIONS"):
                        continue
                    cur.execute(stmt)
                cur.execute(
                    "INSERT INTO schema_migrations (version) VALUES (%s) ON CONFLICT DO NOTHING",
                    (version,),
                )
                print(f"Applied: {version}")
        conn.commit()

    print("Migrations complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
