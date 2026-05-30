# Supabase database setup

This app uses **PostgreSQL** from Netlify Functions (`pg` + SQL). Supabase is compatible — you only change **`DATABASE_URL`**. No Supabase JavaScript client is required for the current app.

## What each key is for

| Variable | Used by this app? | Purpose |
|----------|-------------------|---------|
| **`DATABASE_URL`** | **Yes (required)** | Server connects to Postgres (migrations, login, daily plans, pet, etc.) |
| **`SUPABASE_URL`** | Optional (future) | e.g. `https://YOUR_PROJECT.supabase.co` |
| **Publishable / anon key** | **No (not for server DB)** | Browser + Row Level Security; **do not** use as `DATABASE_URL` |
| **Service role key** | Optional (future admin scripts) | Bypasses RLS — keep secret, server-only |

The **publishable key** you see in the Supabase dashboard is **not** the database password.

## 1. Get the database connection string

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **Project Settings** → **Database**.
3. Under **Connection string**, choose **URI**.
4. Pick **Transaction pooler** (recommended for Netlify serverless) or **Session pooler**.
5. Copy the URI and replace `[YOUR-PASSWORD]` with your **database password** (the one you set when creating the project, or reset under **Database password**).

Example shape (yours will include your password and region):

```text
postgresql://postgres.eozsksefdjdcjqgboxcw:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Direct connection (migrations / local scripts sometimes easier on port 5432):

```text
postgresql://postgres:YOUR_PASSWORD@db.eozsksefdjdcjqgboxcw.supabase.co:5432/postgres?sslmode=require
```

## 2. Local `env.txt`

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.eozsksefdjdcjqgboxcw.supabase.co:5432/postgres?sslmode=require

JWT_SECRET=your-long-secret
ADMIN_API_KEY=your-admin-key
MOONSHOT_API_KEY=your-kimi-key
CORS_ORIGIN=http://localhost:8888
```

Remove old Neon-only lines if you no longer use them (`PGUSER` / `PGPASSWORD` alone are not enough unless you also set `PGHOST`).

## 3. Create tables and seed data

### Option A — Supabase SQL Editor (no password needed for SQL Editor)

See **[supabase/README.md](../supabase/README.md)** and run in order:

1. `supabase/01_schema.sql`
2. `supabase/02_seed_holidays.sql`
3. `supabase/03_seed_wordpack.sql`
4. `supabase/04_verify.sql`

If you forgot the DB password: use SQL Editor anyway, then **Project Settings → Database → Reset database password** for `DATABASE_URL`.

Regenerate seed files after wordpack changes:

```powershell
py scripts/generate_supabase_seed_sql.py
```

### Option B — Local Python scripts (needs DATABASE_URL)

From the project folder:

```powershell
py -m pip install -r requirements.txt
py scripts/setup_db.py
```

This applies migrations `001`–`006` and seeds words + HK holidays.

Verify:

```powershell
py scripts/verify_db.py
```

## 4. Netlify production

In **Site configuration → Environment variables**, set the **same** `DATABASE_URL` (pooler URI is fine), plus `JWT_SECRET`, `ADMIN_API_KEY`, `CORS_ORIGIN`, and optional `MOONSHOT_API_KEY`.

**Redeploy** after changing variables.

Check: `https://YOUR-SITE.netlify.app/api/v1/health` → `"databaseUrl": true`.

## 5. Moving data from Neon (optional)

If you already have users/plans on Neon and want to keep them:

1. Export from Neon: `pg_dump "$NEON_DATABASE_URL" > backup.sql`
2. Import to Supabase: `psql "$SUPABASE_DATABASE_URL" < backup.sql`

If Supabase is **new and empty**, skip this — run `py scripts/setup_db.py` only.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `databaseUrl: false` on health | `DATABASE_URL` missing or wrong in Netlify / `env.txt` |
| `password authentication failed` | Wrong DB password in URI |
| `Tenant or user not found` | Use connection string from **your** project; check pooler vs direct host |
| SSL errors | Keep `?sslmode=require` on the URI |
| Pet / backgrounds 500 | Run migrations through `006_pet_backgrounds.sql` (`py scripts/run_migration.py`) |
