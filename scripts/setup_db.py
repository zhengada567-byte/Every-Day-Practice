"""Run migrations and all seed scripts (wordpack + HK holidays).

Usage:
  py scripts/setup_db.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent


def run(name: str) -> int:
    path = SCRIPTS / name
    print(f"\n--- {name} ---")
    result = subprocess.run([sys.executable, str(path)], check=False)
    return result.returncode


def main() -> int:
    for script in ("run_migration.py", "seed_wordpack.py", "seed_hk_holidays.py"):
        code = run(script)
        if code != 0:
            return code
    print("\nDatabase setup complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
