# Supabase SQL setup (no local DB password needed)

Run these in **[Supabase Dashboard](https://supabase.com/dashboard) → your project → SQL Editor**.

## If you forgot the database password

You do **not** need the password to use the SQL Editor.

To connect **Netlify / local scripts** later:

1. **Project Settings → Database**
2. **Reset database password** → save the new password somewhere safe
3. Copy **Connection string → URI** into `env.txt` and Netlify as `DATABASE_URL`

The **publishable API key** is not the database password.

---

## Run scripts in order

| Step | File | What it does |
|------|------|----------------|
| 1 | [`01_schema.sql`](./01_schema.sql) | All tables (users, words, daily plans, pet, quizzes) |
| 2 | [`02_seed_holidays.sql`](./02_seed_holidays.sql) | HK holidays 2025–2026 |
| 3 | [`03_seed_wordpack.sql`](./03_seed_wordpack.sql) | 91 words, examples, fill-in-the-blank items |

For each file: **New query → paste → Run**.

If `03_seed_wordpack.sql` fails with **`relation "the" does not exist`**, you likely ran an **old** file. Regenerate:

```powershell
py scripts/generate_supabase_seed_sql.py
```

Then re-run `03_seed_wordpack.sql`. (Semicolons inside sentences used to break Supabase’s SQL splitter.)

If `03_seed_wordpack.sql` is too large for one run, split it into chunks in the SQL Editor (e.g. lines 1–300, 301–600, 601–end).

---

## Regenerate seed files (optional)

After changing `data/wordpack.json` or holidays:

```powershell
py scripts/generate_supabase_seed_sql.py
```

This writes `02_seed_holidays.sql` and `03_seed_wordpack.sql` — **no database connection required**.

---

## Verify in SQL Editor

```sql
SELECT COUNT(*) AS words FROM words;           -- expect 91
SELECT COUNT(*) AS blanks FROM blank_items;  -- expect 364
SELECT COUNT(*) AS holidays FROM holidays;   -- expect 34
SELECT * FROM schema_migrations ORDER BY version;
```

---

## After setup

1. Reset DB password if needed (see above)
2. Set `DATABASE_URL` in `env.txt` and Netlify
3. Redeploy Netlify
4. Create parents via Admin API or app (users are **not** in these SQL files)

See also [SUPABASE.md](../docs/SUPABASE.md).
