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
   ```

2. Install and start:

   ```powershell
   npm install
   npm run dev
   ```

   Netlify Dev serves the static game **and** API functions (default port **8888**).

## Step 4 — Weekly quiz

- Opens **Saturday** (HK) for words learned Mon–Fri that week (`word_role = new`, completed plans).
- **Sunday / later workdays:** makeup if quiz not finished (blocks new words).
- **3 questions per word:** meaning or picture, blank, sentence.
- **Mastered** = all 3 correct for that word; any wrong → retry pool (demotes if was mastered).
- After quiz, up to **3 mastered words** appear in daily review.

## Step 5 — Monthly test & parent reports

- Opens on the **last Saturday** of each month (HK calendar).
- Words = all **new** words from completed workdays that month.
- Same 3 questions per word and mastery rules as the weekly quiz.
- On last Saturday: finish **weekly quiz first**, then **monthly test** if both are open.
- Parent home → click a child → **View progress** (mastery counts + recent quiz reports).
- API: `GET /parent/children/:childId/reports?type=weekly|monthly&limit=20`

## Step 3 — Daily plan (browser)

1. `npm run dev` → open **http://localhost:8888**
2. **Sign up** as parent → **Add a child** (email + password)
3. **Log out** → **Log in** as the child
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

### Register parent

```powershell
$body = @{
  email = "parent@example.com"
  password = "password123"
  displayName = "Test Parent"
  role = "parent"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8888/api/v1/auth/register `
  -ContentType "application/json" -Body $body
```

Save the `token` from the response.

### Create child (parent token)

```powershell
$headers = @{ Authorization = "Bearer YOUR_PARENT_TOKEN" }
$body = @{
  displayName = "Alex"
  email = "alex@example.com"
  password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri http://localhost:8888/api/v1/parent/children `
  -Headers $headers -ContentType "application/json" -Body $body
```

### Login as child

```powershell
$body = @{ email = "alex@example.com"; password = "password123" } | ConvertTo-Json
$res = Invoke-RestMethod -Method Post -Uri http://localhost:8888/api/v1/auth/login `
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
- `CORS_ORIGIN` (your site URL, e.g. `https://your-app.netlify.app`)

Push the repo and connect to Netlify; `netlify.toml` routes `/api/v1/*` to the function.
