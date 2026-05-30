# Everyday Word Practice — Database & API Spec

Locked product rules (HK timezone, holidays, assessments, gating). Implementation target: **Netlify** (static UI + Functions) + **Neon PostgreSQL**.

---

## 1. Time & calendar

| Concept | Rule |
|---------|------|
| Timezone | `Asia/Hong_Kong` for all dates and cutoffs |
| Workday | Mon–Fri, not in `holidays` |
| Daily cutoff | Incomplete plan → missed at **23:59:59** local date |
| Sunday | No new 5 words; assessment makeup only |
| Saturday | Assessments only (weekly quiz; monthly on last Sat) |
| Learning gate | No new daily plan until **no** blocking `weekly` / `monthly` assessment |
| Daily words | **5 new** + **3 review** from **mastered** list; **before first quiz** / no mastered yet = **5 new only** |
| Review practice | Mastered words in daily plan: **Level 1 + Level 2 only** (no Level 3) |
| New-word practice | **Learn → L1 → L2 → L3** (meaning required on L1; picture optional) |

---

## 2. Entity relationship (overview)

```
users ──┬── parent_children ── users (child)
        │
        └── child profile state

words ──┬── word_examples
        └── blank_items

holidays (HK)

daily_plans ── daily_plan_words ── words
assessments ── assessment_items ── words
              └── assessment_word_results

child_word_state (per child per word: pool / mastered / history)
practice_attempts (optional detail log)
reports (denormalized summaries for parent UI)
```

---

## 3. PostgreSQL schema

### 3.1 `users`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `email` | `text` UNIQUE NOT NULL | login |
| `password_hash` | `text` NOT NULL | bcrypt |
| `role` | `text` NOT NULL | `parent` \| `child` |
| `display_name` | `text` NOT NULL | |
| `created_at` | `timestamptz` | default `now()` |
| `last_login_at` | `timestamptz` | |

Indexes: `email`, `role`.

### 3.2 `parent_children`

| Column | Type | Notes |
|--------|------|--------|
| `parent_id` | `uuid` FK → `users` | |
| `child_id` | `uuid` FK → `users` | UNIQUE per child |
| `created_at` | `timestamptz` | |

PK: `(parent_id, child_id)`.

### 3.3 `words`

Content seed from `data/wordpack.json` (modules flattened).

| Column | Type | Notes |
|--------|------|--------|
| `id` | `serial` PK | |
| `lemma` | `text` UNIQUE NOT NULL | e.g. `carbon footprint` |
| `explanation` | `text` NOT NULL | |
| `picture_emoji` | `text` NOT NULL | keep emoji map / stored char |
| `picture_search` | `text` | optional, future images |
| `picture_style` | `text` | `cartoon` \| `diagram` \| `photo` |
| `active` | `boolean` | default `true` |
| `created_at` | `timestamptz` | |

### 3.4 `word_examples`

Short sample sentences for **Learn** (from `examples[]` in JSON).

| Column | Type |
|--------|------|
| `id` | `serial` PK |
| `word_id` | `int` FK → `words` |
| `text` | `text` NOT NULL |
| `sort_order` | `smallint` default 0 |

### 3.5 `blank_items`

Fill-in-the-blank for **Level 2** and quiz L2 items.

| Column | Type |
|--------|------|
| `id` | `serial` PK |
| `word_id` | `int` FK → `words` |
| `text` | `text` NOT NULL | contains `___` |
| `answer` | `text` NOT NULL |
| `distractors` | `jsonb` NOT NULL | string[3] |
| `active` | `boolean` default true |

### 3.6 `holidays`

| Column | Type | Notes |
|--------|------|--------|
| `date` | `date` PK | HK calendar date |
| `name` | `text` | |
| `region` | `text` | default `HK` |

Seed file: `data/hk-holidays.json` (GovHK 2025–2026; run `py scripts/seed_hk_holidays.py`).

Workday check: weekday Mon–Fri AND `date NOT IN holidays`.  
Sundays are not stored (already non-workdays). Saturday public holidays are stored for reference but do not change Mon–Fri workday count.

### 3.7 `child_word_state`

Per child × word lifecycle (pool, assignment, mastery).

| Column | Type | Notes |
|--------|------|--------|
| `child_id` | `uuid` FK | |
| `word_id` | `int` FK | |
| `status` | `text` | `available` \| `assigned` \| `mastered` |
| `source` | `text` | `new` \| `retry` \| `missed_day` |
| `mastered_at` | `timestamptz` | set when word **passes a quiz/test**; mastered words = **review pool** |
| `last_assigned_date` | `date` | HK date of last daily plan |
| `updated_at` | `timestamptz` | |

PK: `(child_id, word_id)`.  
Index: `(child_id, status)`.

**Transitions**

- Assign daily: `available` → `assigned`.
- Midnight missed plan: `assigned` → `available`, `source` = `missed_day`.
- Quiz/test all items correct for word: → `mastered`, set `mastered_at`.
- Any wrong on assessment: → `available`, `source` = `retry`, clear `mastered_at` (**demote** — leaves review pool).
- Completing a **daily plan** does **not** add words to the review pool; only **quiz mastery** does.

### 3.8 `daily_plans`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `child_id` | `uuid` FK | |
| `plan_date` | `date` NOT NULL | HK |
| `status` | `text` | `in_progress` \| `completed` \| `missed` |
| `phase` | `text` | `learn` \| `l1` \| `l2` \| `l3` \| `done` |
| `new_word_count` | `smallint` | default 5 |
| `review_word_count` | `smallint` | 0 until child has mastered words; up to 3 after |
| `created_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | when phase reaches `done` |

UNIQUE `(child_id, plan_date)`.  
Created on **workdays** when gate open: **5 new** always; **+3 review** from **`status = mastered`** (after first quiz has produced mastered words).

### 3.9 `daily_plan_words`

| Column | Type |
|--------|------|
| `daily_plan_id` | `uuid` FK |
| `word_id` | `int` FK |
| `word_role` | `text` | `new` \| `review` |
| `slot` | `smallint` | 1–5 = new, 6–8 = review (when present) |

PK: `(daily_plan_id, word_id)`.

### 3.10 `practice_attempts` (optional but recommended)

Granular log for parent reports and debugging.

| Column | Type |
|--------|------|
| `id` | `bigserial` PK |
| `child_id` | `uuid` |
| `daily_plan_id` | `uuid` nullable |
| `word_id` | `int` |
| `activity` | `text` | `learn` \| `match_meaning` \| `match_picture` \| `blank` \| `sentence` |
| `correct` | `boolean` |
| `payload` | `jsonb` | client metadata |
| `created_at` | `timestamptz` |

### 3.11 `assessments`

Weekly quiz or monthly test.

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `child_id` | `uuid` FK | |
| `type` | `text` | `weekly` \| `monthly` |
| `period_key` | `text` | e.g. `2026-W22`, `2026-05` |
| `scheduled_date` | `date` | Sat (last Sat for monthly) |
| `status` | `text` | see below |
| `word_count` | `int` | words in scope |
| `started_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | |

**Status enum**

- `scheduled` — created, not started
- `in_progress` — started
- `pending_makeup` — missed scheduled Sat deadline (23:59:59 HK)
- `completed`
- `expired` — superseded when newer assessment of same type opens

UNIQUE `(child_id, type, period_key)`.

**Blocking gate**: child has blocking assessment if any row with  
`type IN ('weekly','monthly')` AND `status IN ('scheduled','in_progress','pending_makeup')`.

When a **new** weekly/monthly assessment is created for a new period, set previous same-type non-completed to `expired` (no mastery change from expired quiz).

### 3.12 `assessment_items`

Generated question instances (snapshot for consistent grading).

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `assessment_id` | `uuid` FK | |
| `word_id` | `int` FK | |
| `item_type` | `text` | `match_meaning` \| `match_picture` \| `blank` \| `sentence` |
| `sort_order` | `int` | |
| `payload` | `jsonb` | choices, sentence text, etc. |
| `answer_key` | `jsonb` | correct ids / blank answer / sentence rules |

Multiple items per word allowed; mastery uses **all** items for that `word_id`.

### 3.13 `assessment_responses`

| Column | Type |
|--------|------|
| `id` | `bigserial` PK |
| `assessment_item_id` | `uuid` FK |
| `child_id` | `uuid` |
| `response` | `jsonb` |
| `correct` | `boolean` |
| `submitted_at` | `timestamptz` |

UNIQUE `(assessment_item_id, child_id)` if one attempt per item.

### 3.14 `assessment_word_results`

Denormalized per-word outcome after assessment submit.

| Column | Type |
|--------|------|
| `assessment_id` | `uuid` |
| `word_id` | `int` |
| `all_correct` | `boolean` |
| `items_total` | `smallint` |
| `items_correct` | `smallint` |

PK: `(assessment_id, word_id)`.

### 3.15 `reports`

Parent-friendly summaries (also computable on read).

| Column | Type |
|--------|------|
| `id` | `uuid` PK |
| `child_id` | `uuid` |
| `assessment_id` | `uuid` FK nullable |
| `daily_plan_id` | `uuid` FK nullable |
| `report_type` | `text` | `daily` \| `weekly` \| `monthly` |
| `period_key` | `text` |
| `summary` | `jsonb` | scores, word lists, breakdown |
| `created_at` | `timestamptz` |

---

## 4. Core algorithms (server)

### 4.1 `is_workday(date)`

```text
weekday in Mon..Fri AND date NOT IN holidays WHERE region = 'HK'
```

### 4.2 `has_blocking_assessment(child_id)`

```sql
EXISTS (
  SELECT 1 FROM assessments
  WHERE child_id = $1
    AND type IN ('weekly', 'monthly')
    AND status IN ('scheduled', 'in_progress', 'pending_makeup')
)
```

### 4.3 Assign daily plan (workday only)

**Preconditions**

1. `is_workday(today_hk)`
2. NOT `has_blocking_assessment(child_id)`
3. No `daily_plans` for `today_hk` with status `in_progress` or `completed`

**Pick 5 new words**

1. Pool: `child_word_state` where `status = 'available'` (never-seen or retry/missed).
2. Order: `retry` / `missed_day` first, then never introduced, shuffle within tier.
3. Take exactly **5**; error if fewer than 5 remain in corpus.

**Pick up to 3 review words**

1. Pool: `child_word_state` where `status = 'mastered'`, excluding today’s 5 new picks.
2. Order: least recently assigned (`last_assigned_date`) first, then shuffle; take up to **3**.
3. **No mastered words yet** (before first quiz, or quiz got none correct): **0** review → plan has **5 words total**.

**Insert plan**

- `daily_plans`: `new_word_count = 5`, `review_word_count = 0..3`
- `daily_plan_words`: slots 1–5 `word_role = new`; slots 6–8 `word_role = review`
- New words: `status = assigned`. Review words: remain **`mastered`**; linked to today’s plan only (`last_assigned_date` updated).

### 4.4 Advance daily phase

`learn` → `l1` → `l2` → `l3` → `done` (no 80% threshold).

| Phase | Words in scope |
|-------|----------------|
| **learn** | All assigned (5 new + up to 3 review) |
| **l1** | All assigned — **meaning match required** for every word; picture optional |
| **l2** | All assigned — fill-in-the-blank |
| **l3** | **`word_role = new` only** (5 words) — sentence building |
| **done** | Plan complete |

- `l1` → `l2`: meaning match done for **all** words in plan (new + review).
- `l2` → `l3`: blanks done for **all** words in plan.
- `l3` → `done`: sentences done for **5 new** words only.
- On `done`: new words `assigned` → `available` (not mastered until quiz). Review words stay **`mastered`**.

### 4.5 Midnight job (`close_day` HK)

For each `daily_plans` where `plan_date = yesterday` and `status = in_progress`:

- Set `status = missed`
- Release words: `assigned` → `available`, `source = missed_day`

For assessments where `scheduled_date = yesterday` and still not `completed`:

- Set `status = pending_makeup`

### 4.6 Saturday jobs

**Weekly** (every Saturday, including public holidays):

1. Expire prior incomplete weekly assessments → `expired`.
2. `period_key` = ISO week of **completed** workdays Mon–Fri in that week.
3. Collect `word_id` from `daily_plan_words` where `word_role = 'new'` and daily plan `status = completed`, `plan_date` in that week’s workdays.
4. Create `assessments` type `weekly`, generate `assessment_items` (mixed L1/L2/L3 per word — define mix rule below).

**Monthly** (last Saturday of month in HK):

1. Expire prior incomplete monthly → `expired`.
2. `period_key` = `YYYY-MM`.
3. Words from `daily_plan_words` where `word_role = 'new'` and plan completed in that calendar month (workdays only).
4. Create `assessments` type `monthly`, generate items.

### 4.7 Assessment item mix (default proposal)

Per word in assessment:

| Item | Count |
|------|-------|
| `match_meaning` OR `match_picture` | 1 (random) |
| `blank` | 1 (random `blank_items` row) |
| `sentence` | 1 (prompt only; grade with same rules as L3) |

**Mastery**: for each `word_id`, `all_correct` iff every `assessment_responses.correct = true` for its items.

On submit:

- `all_correct` → `child_word_state.status = mastered`
- else → `available`, `source = retry`, demote if was mastered

### 4.8 Level 1 practice (daily)

- **Meaning match** (`match_meaning`): **required** for **all words in today’s plan** (new + review) before Level 2.
- **Picture match** (`match_picture`): **optional** for any word; does not block phase advance.
- **Level 3**: **new words only** — review words never get sentence practice on daily plans.
- No 80% accuracy threshold.

**Today payload** (addition):

```json
{
  "date": "2026-05-29",
  "isWorkday": true,
  "newWords": [ "...5..." ],
  "reviewWords": [ "...0–3..." ],
  "wordCount": 5,
  "blockingAssessment": null,
  "dailyPlan": { "newWordCount": 5, "reviewWordCount": 0, "phase": "learn", "words": [] },
  "canStartDaily": true
}
```

On **first workdays** (no mastered words yet): `reviewWords = []`, `wordCount = 5`.  
After **first quiz** produces mastered words: up to **3** review per day, `wordCount = 5..8`.

---

## 5. REST API (Netlify Functions)

Base path: `/api/v1`  
Auth: `Authorization: Bearer <jwt>` or httpOnly session cookie.  
Child endpoints require `role=child` or parent impersonation disabled (parent uses child-scoped read APIs only).

### 5.1 Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/register` | `{ email, password, displayName, role: "parent" }` | user + token |
| POST | `/auth/login` | `{ email, password }` | user + token |
| POST | `/auth/logout` | — | 204 |
| GET | `/auth/me` | — | current user |

### 5.2 Parent — children

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/parent/children` | `{ displayName, email, password }` | child user |
| GET | `/parent/children` | — | list children |
| GET | `/parent/children/:childId/dashboard` | — | today state, blocking assessment, streak |
| GET | `/parent/children/:childId/reports` | `?type=weekly\|monthly\|daily&limit=20` | reports[] |
| GET | `/parent/children/:childId/mastery` | — | mastered + retry counts |

### 5.3 Child — today & gate

| Method | Path | Response |
|--------|------|----------|
| GET | `/child/today` | See **Today payload** below |
| POST | `/child/daily-plan/start` | creates plan if allowed; else 409 + blocking assessment |

**Today payload**

```json
{
  "date": "2026-05-29",
  "isWorkday": true,
  "isSaturday": false,
  "isSunday": false,
  "blockingAssessment": { "id", "type", "periodKey", "status" } | null,
  "dailyPlan": { "id", "phase", "status", "words": [...] } | null,
  "canStartDaily": true
}
```

### 5.4 Child — daily learning

| Method | Path | Notes |
|--------|------|--------|
| GET | `/child/daily-plan/:id/words` | Learn cards: lemma, explanation, emoji, examples |
| POST | `/child/daily-plan/:id/phase/complete` | `{ phase: "learn"\|"l1"\|"l2"\|"l3" }` → next phase |
| POST | `/child/daily-plan/:id/practice/submit` | batch results for L1/L2/L3 |
| POST | `/child/daily-plan/:id/sentence/check` | proxy LanguageTool optional |

**Practice submit body (example)**

```json
{
  "activity": "blank",
  "results": [
    { "wordId": 12, "correct": true, "blankItemId": 44 }
  ]
}
```

### 5.5 Child — assessments

| Method | Path | Notes |
|--------|------|--------|
| GET | `/child/assessments/current` | blocking or scheduled for today |
| GET | `/child/assessments/:id` | metadata + items (without answer keys) |
| POST | `/child/assessments/:id/start` | `in_progress` |
| POST | `/child/assessments/:id/respond` | `{ itemId, response }` → `{ correct }` |
| POST | `/child/assessments/:id/complete` | finalize word results, mastery, report |

### 5.6 Content (read-only)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/words/:id` | admin/debug |
| GET | `/health` | DB ping |

### 5.7 Cron (secured header)

| Method | Path | When |
|--------|------|------|
| POST | `/cron/close-day` | daily 00:05 HK |
| POST | `/cron/open-weekly` | Sat 00:05 HK |
| POST | `/cron/open-monthly` | last Sat 00:05 HK |

Netlify scheduled functions or external cron → `CRON_SECRET`.

### 5.8 Admin / seed (one-time)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/admin/seed-wordpack` | `ADMIN_SECRET`; reads wordpack JSON → DB |
| POST | `/admin/holidays` | bulk import HK holidays |

---

## 6. HTTP status conventions

| Code | When |
|------|------|
| 409 | `canStartDaily=false` (blocking assessment) |
| 403 | parent accessing wrong child |
| 422 | invalid phase transition |

---

## 7. Environment variables

| Name | Purpose |
|------|---------|
| `DATABASE_URL` | Supabase/Postgres connection string (server only) |
| `JWT_SECRET` | sign tokens |
| `CRON_SECRET` | cron endpoints |
| `ADMIN_SECRET` | seed endpoint |
| `CORS_ORIGIN` | Netlify site URL |

Never expose `DATABASE_URL` to the browser.

---

## 8. Implementation order

1. SQL migration `001_initial.sql` + seed script from `wordpack.json`
2. Auth functions + `users` / `parent_children`
3. `GET /child/today` + daily plan assign + phase APIs
4. Port L1/L2/L3 UI to API-driven daily flow
5. Assessments generate + respond + complete + reports
6. Cron jobs (close-day, open weekly/monthly)
7. Parent dashboard APIs
8. Netlify deploy + env config

---

## 9. Frontend mapping (existing repo)

| Existing | New |
|----------|-----|
| `data/wordpack.json` | seed only |
| `js/storage.js` | replace with API client + minimal session cache |
| `js/app.js` flows | daily 5 + assessments; remove module picker |
| `js/game.js` emoji | `picture_emoji` from API |
| `js/sentence-check.js` | keep client-side |
| Parent PIN view | real parent login + `/parent/children/...` |

---

## 10. Open implementation details (defaults chosen)

| Topic | Default |
|-------|---------|
| L1 daily completion | Meaning required for **all** words in plan (new + review); picture optional |
| Daily word mix | 5 new + up to 3 review from **mastered** list; 5 new only until first quiz creates mastered words |
| JWT TTL | 7 days refresh via login |
| Assessment deadline → makeup | Sat 23:59:59 → `pending_makeup`; Sun–Fri allowed until completed or expired by next period |
| Distractors on seed | pick from same global pool as `build_wordpack.py` module peers → remap to random same-pool words |

---

*Document version: 1.0 — matches conversation spec as of 2026-05-29.*
