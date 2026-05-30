# Step 2 — API testing

Base URL when running locally with Netlify Dev:

```text
http://localhost:8888/api/v1
```

## Setup

1. Add to `.env` or `env.txt` (alongside `DATABASE_URL`):

   ```env
   JWT_SECRET=your-long-random-secret-here
   CORS_ORIGIN=http://localhost:8888
   ADMIN_API_KEY=your-admin-secret
   ```

2. Install and start:

   ```powershell
   npm install
   npm run dev
   ```

   Netlify Dev serves the static game **and** API functions (default port **8888**).

### Accounts (admin / parent / child)

- Only **admin** creates parents: `POST /admin/parents` with header `X-Admin-Key` (set `ADMIN_API_KEY` in env).
- Example: account `parentada` → email `parentada@everydaypractice.com`, default password `qwer1234`.
- Parent logs in (can change password), adds child by **name only** (e.g. `Alex` → system uses `alex_parentada@everydaypractice.com` internally).
- Child logs in with **parent account** + **child name** + password; browser caches recent choices.

### QA test account (skip questions)

1. **Admin** tab → **Create test accounts** (or `POST /admin/test/setup` with `X-Admin-Key`).
2. Child login: parent `testparent`, name `Tester`, password `testpass1` — **10,000 golden coins** on setup.
3. On **Today**, use the **Test tools** panel: seed week dailies → open weekly/monthly → skip quiz, or use **Skip step** during practice.

Automated flow (with `npm run dev`):

```powershell
npm run test:flow
```

## Step 4 — Weekly quiz

- Opens **Saturday** (HK) for words learned Mon–Fri that week (`word_role = new`, completed plans).
- **Sunday / later workdays:** makeup if quiz not finished (blocks new words).
- **3 questions per word:** meaning or picture, blank, sentence.
- **Mastered** = all 3 correct for that word; any wrong → retry pool (demotes if was mastered).
- After quiz, up to **3 mastered words** appear in daily review.

## Step 5 — Monthly test & parent reports

- Opens on the **last Saturday** of each month (HK calendar).
- Words = all **new** words from completed workdays that month.
- **One Level 2 (fill-in-the-blank) question per word** — no L1 meaning/picture items (shorter than weekly quiz).
- Mastery: all blank items correct for that word.
- On last Saturday: finish **weekly quiz first**, then **monthly test** if both are open.
- Parent home → click a child → **View progress** (mastery counts + recent quiz reports).
- API: `GET /parent/children/:childId/reports?type=weekly|monthly&limit=20`

## Step 3 — Daily plan (browser)

1. `npm run dev` → open **http://localhost:8888**
2. **Admin** tab (or API): create parent `parentada` → parent logs in with default password `qwer1234`
3. Parent **Add child** (name + password only) → **Log out** → **Child** tab: parent account + child name + password
4. **Start today's words** → Learn → Level 1 → 2 → 3

First day: **5 new**, **0 review**. After a quiz creates mastered words: **5 new + up to 3 review** (review = L1 + L2 only).

## Automated smoke test

With `npm run dev` running in another terminal:

```powershell
npm run test:api
```

## Manual tests (PowerShell)

### Health

```powershell
Invoke-RestMethod http://localhost:8888/api/v1/health
```

### Admin: create parent

```powershell
$adminKey = "YOUR_ADMIN_API_KEY"
$body = @{ accountName = "parentada"; displayName = "Ada Parent" } | ConvertTo-Json
$parent = Invoke-RestMethod -Method Post -Uri http://localhost:8888/api/v1/admin/parents `
  -Headers @{ "X-Admin-Key" = $adminKey } -ContentType "application/json" -Body $body
# Email: parentada@everydaypractice.com  Password: qwer1234
```

### Parent login

```powershell
$body = @{ email = "parentada@everydaypractice.com"; password = "qwer1234" } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:8888/api/v1/auth/login `
  -ContentType "application/json" -Body $body
$parentToken = $res.token
```

### Create child (parent token)

```powershell
$headers = @{ Authorization = "Bearer $parentToken" }
$body = @{ displayName = "Alex"; password = "childpass1" } | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8888/api/v1/parent/children `
  -Headers $headers -ContentType "application/json" -Body $body
```

### Login as child

```powershell
$body = @{ parentAccount = "parentada"; childName = "Alex"; password = "childpass1" } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:8888/api/v1/auth/child-login `
  -ContentType "application/json" -Body $body
$childToken = $res.token
```

### Today (child)

```powershell
$headers = @{ Authorization = "Bearer $childToken" }
Invoke-RestMethod -Uri http://localhost:8888/api/v1/child/today -Headers $headers
```

Expected fields: `date`, `isWorkday`, `isSaturday`, `isSunday`, `blockingAssessment`, `dailyPlan`, `canStartDaily`.

On a **workday** with no quiz blocking: `canStartDaily: true`, `dailyPlan: null`.

On **Saturday**: `isSaturday: true`, `canStartDaily: false`.

### Parent dashboard

```powershell
$childId = "CHILD_UUID_FROM_CREATE"
Invoke-RestMethod -Uri "http://localhost:8888/api/v1/parent/children/$childId/dashboard" `
  -Headers @{ Authorization = "Bearer YOUR_PARENT_TOKEN" }
```

## Deploy to Netlify

Set environment variables in Netlify dashboard:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_API_KEY`
- `MOONSHOT_API_KEY` (Kimi / Moonshot — Level 3 sentence AI check)
- `CORS_ORIGIN` (your site URL, e.g. `https://your-app.netlify.app`)

Optional Kimi settings:

- `MOONSHOT_API_BASE_URL` — default `https://api.moonshot.ai/v1` (China: `https://api.moonshot.cn/v1`)
- `MOONSHOT_MODEL` — default `moonshot-v1-8k` (e.g. `kimi-k2-turbo`, `kimi-k2.6`)

Push the repo and connect to Netlify; `netlify.toml` routes `/api/v1/*` to the function.
