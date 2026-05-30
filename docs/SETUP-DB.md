# Database setup (Step 1)

Works with **Supabase** or any PostgreSQL host. See [SUPABASE.md](./SUPABASE.md) for Supabase-specific steps.

## Prerequisites

1. A PostgreSQL database (e.g. [Supabase](https://supabase.com/dashboard)).
2. Full connection string in `.env` or `env.txt`:

   ```env
   DATABASE_URL=postgresql://postgres:PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require
   ```

   Get this from Supabase → **Project Settings → Database → Connection string (URI)**.  
   The **publishable/anon API key is not** the database password.

   `PGUSER` / `PGPASSWORD` alone are not enough unless you also set `PGHOST`.

## One-command setup

From the project folder:

```powershell
cd d:\Game\EverydayWordPractice
py -m pip install -r requirements.txt
py scripts/setup_db.py
```

This runs, in order:

1. `migrations/001_initial.sql` — all tables
2. `scripts/seed_wordpack.py` — 91 words from `data/wordpack.json`
3. `scripts/seed_hk_holidays.py` — HK holidays 2025–2026

## Individual commands

```powershell
py scripts/run_migration.py
py scripts/seed_wordpack.py
py scripts/seed_hk_holidays.py
```

## Verify

**Option A — script (recommended)**

```powershell
py scripts/verify_db.py
```

Expect: 91 words, 91 examples, 364 blanks, 34 holidays, 1 migration.

**Option B — Supabase SQL editor**

```sql
SELECT COUNT(*) FROM words;          -- expect 91
SELECT COUNT(*) FROM blank_items;    -- expect 364
SELECT COUNT(*) FROM holidays;       -- expect 34
SELECT * FROM schema_migrations;
```

## Re-run seeds

- **Wordpack** — safe to re-run; upserts by `lemma`, refreshes examples and blanks.
- **Holidays** — safe to re-run; upserts by `date`.
- **Migration** — skipped if `001_initial.sql` is already recorded in `schema_migrations`.
