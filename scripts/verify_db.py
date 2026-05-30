"""Print row counts to confirm database setup.

Usage:
  py scripts/verify_db.py
"""
from __future__ import annotations

import sys

from db_util import get_database_url

CHECKS = [
    ("words", "SELECT COUNT(*) FROM words", 91),
    ("word_examples", "SELECT COUNT(*) FROM word_examples", 91),
    ("blank_items", "SELECT COUNT(*) FROM blank_items", 364),
    ("holidays", "SELECT COUNT(*) FROM holidays", 34),
    ("schema_migrations", "SELECT COUNT(*) FROM schema_migrations", 1),
]


def main() -> int:
    try:
        import psycopg
    except ImportError:
        print("Install psycopg: py -m pip install psycopg[binary]", file=sys.stderr)
        return 1

    try:
        url = get_database_url()
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    ok = True
    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            print("Everyday Word Practice — database check\n")
            for label, sql, expected in CHECKS:
                cur.execute(sql)
                count = cur.fetchone()[0]
                status = "OK" if count == expected else "UNEXPECTED"
                if count != expected:
                    ok = False
                print(f"  {label:20} {count:4}  (expected {expected})  [{status}]")

            cur.execute(
                """
                SELECT lemma, picture_emoji
                FROM words
                ORDER BY lemma
                LIMIT 3
                """
            )
            sample = cur.fetchall()
            print("\nSample words:")
            for lemma, emoji in sample:
                line = f"  {emoji}  {lemma}"
                try:
                    print(line)
                except UnicodeEncodeError:
                    print(f"  {lemma}  (emoji stored)")

            cur.execute("SELECT version FROM schema_migrations ORDER BY version")
            versions = [row[0] for row in cur.fetchall()]
            print(f"\nApplied migrations: {', '.join(versions) or '(none)'}")

    print("\n" + ("All checks passed." if ok else "Some counts differ — re-run seed scripts if needed."))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
