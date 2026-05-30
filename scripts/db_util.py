"""Shared database helpers for migration and seed scripts."""
from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_dotenv() -> None:
    """Load .env or env.txt from project root into os.environ (no overwrite)."""
    for name in (".env", "env.txt"):
        path = ROOT / name
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


def get_database_url() -> str:
    load_dotenv()
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    host = os.environ.get("PGHOST")
    user = os.environ.get("PGUSER")
    password = os.environ.get("PGPASSWORD")
    database = os.environ.get("PGDATABASE", "postgres")
    if host and user and password:
        port = os.environ.get("PGPORT", "5432")
        ssl = os.environ.get("PGSSLMODE", "require")
        return (
            f"postgresql://{user}:{password}@{host}:{port}/{database}?sslmode={ssl}"
        )
    raise RuntimeError(
        "Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD (and optional PGDATABASE)."
    )


def strip_line_comments(sql: str) -> str:
    """Remove full-line -- comments; keep SQL lines."""
    kept: list[str] = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        kept.append(line)
    return "\n".join(kept).strip()


def split_sql(sql: str) -> list[str]:
    """Split SQL file on semicolons outside of single-quoted strings."""
    statements: list[str] = []
    buf: list[str] = []
    in_quote = False
    i = 0
    while i < len(sql):
        ch = sql[i]
        if ch == "'" and not in_quote:
            in_quote = True
            buf.append(ch)
        elif ch == "'" and in_quote:
            if i + 1 < len(sql) and sql[i + 1] == "'":
                buf.append("''")
                i += 1
            else:
                in_quote = False
                buf.append(ch)
        elif ch == ";" and not in_quote:
            stmt = strip_line_comments("".join(buf))
            if stmt:
                statements.append(stmt)
            buf = []
        else:
            buf.append(ch)
        i += 1
    tail = strip_line_comments("".join(buf))
    if tail:
        statements.append(tail)
    return statements
