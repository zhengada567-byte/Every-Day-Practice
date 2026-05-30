"""Insert HK general holidays from data/hk-holidays.json into PostgreSQL.

Requires DATABASE_URL in the environment (or .env loaded by your shell).

Usage:
  set DATABASE_URL=postgresql://...
  py scripts/seed_hk_holidays.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from db_util import ROOT, get_database_url

DATA = ROOT / "data" / "hk-holidays.json"


def main() -> int:
    try:
        url = get_database_url()
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    try:
        import psycopg
    except ImportError:
        print("Install psycopg: py -m pip install psycopg[binary]", file=sys.stderr)
        return 1

    payload = json.loads(DATA.read_text(encoding="utf-8"))
    rows = payload["holidays"]
    region = payload.get("region", "HK")

    sql = """
        INSERT INTO holidays (date, name, region)
        VALUES (%s, %s, %s)
        ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name, region = EXCLUDED.region
    """

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            for row in rows:
                cur.execute(sql, (row["date"], row["name"], region))
        conn.commit()

    print(f"Upserted {len(rows)} holidays from {DATA.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
