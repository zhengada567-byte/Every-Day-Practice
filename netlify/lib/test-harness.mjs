import bcrypt from "bcryptjs";
import { query, withTransaction } from "./db.mjs";
import {
  childEmailForParent,
  DEFAULT_PARENT_PASSWORD,
  parentEmailFromAccountName,
} from "./accounts.mjs";
import {
  fetchPlanDetail,
  startDailyPlan,
} from "./daily.mjs";
import {
  completeAssessment,
  fridayOfWeek,
  generateItems,
  getMonthCompletedNewWordIds,
  getWeekCompletedNewWordIds,
  isoWeekKey,
  lastSaturdayOfMonth,
  mondayOfWeek,
  monthPeriodKey,
  respondToItem,
  saturdayOfWeek,
} from "./assessments.mjs";
import { getHkNow, isWorkday } from "./calendar.mjs";
import { ensurePetSchema } from "./pet.mjs";

export const TEST_PARENT_ACCOUNT = "testparent";
export const TEST_CHILD_NAME = "Tester";
export const TEST_CHILD_PASSWORD = "testpass1";
/** Golden coins for the test child (Tester) when admin creates test accounts. */
export const TEST_CHILD_START_COINS = 10000;

let schemaReady = false;

export async function ensureTestSchema() {
  if (schemaReady) return;
  await query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE`
  );
  schemaReady = true;
}

export async function isTestChild(childId, q = query) {
  await ensureTestSchema();
  const { rows } = await q(
    `SELECT is_test_account FROM users WHERE id = $1 AND role = 'child'`,
    [childId]
  );
  return !!rows[0]?.is_test_account;
}

export async function requireTestChild(childId, q = query) {
  if (!(await isTestChild(childId, q))) {
    const err = new Error("Test tools are only for test accounts");
    err.status = 403;
    throw err;
  }
}

/** Fast path for QA: mark plan done without running each phase. */
export async function fastCompleteDailyPlan(planId, childId, q = query) {
  const plan = await fetchPlanDetail(planId, childId, q);
  if (!plan) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }
  if (plan.status === "completed") return plan;

  await q(
    `
    UPDATE daily_plans
    SET phase = 'done', status = 'completed', completed_at = COALESCE(completed_at, now())
    WHERE id = $1 AND child_id = $2
    `,
    [planId, childId]
  );
  await q(
    `
    UPDATE child_word_state cws
    SET status = 'available', updated_at = now()
    FROM daily_plan_words dpw
    WHERE dpw.daily_plan_id = $1
      AND dpw.word_role = 'new'
      AND cws.child_id = $2
      AND cws.word_id = dpw.word_id
    `,
    [planId, childId]
  );
  return fetchPlanDetail(planId, childId, q);
}

export async function finishDailyPlanAllPhases(planId, childId, q = query) {
  let plan = await fetchPlanDetail(planId, childId, q);
  if (!plan) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }
  if (plan.status === "completed" || plan.phase === "done") {
    return plan;
  }
  return fastCompleteDailyPlan(planId, childId, q);
}

export async function seedCompletedDay(childId, planDate, q = query) {
  const existing = await q(
    `SELECT id, status FROM daily_plans WHERE child_id = $1 AND plan_date = $2::date`,
    [childId, planDate]
  );
  if (existing.rows.length) {
    const row = existing.rows[0];
    if (row.status === "completed") {
      return fetchPlanDetail(row.id, childId, q);
    }
    return finishDailyPlanAllPhases(row.id, childId, q);
  }

  const plan = await startDailyPlan(childId, q, { testMode: true, planDate });
  return finishDailyPlanAllPhases(plan.id, childId, q);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T12:00:00+08:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

export async function seedCurrentWeekWorkdays(childId, q = query, maxDays = 3) {
  const hk = getHkNow();
  const monday = mondayOfWeek(hk.date);
  const friday = fridayOfWeek(hk.date);
  const seeded = [];
  let count = 0;
  for (let d = monday; d <= friday && count < maxDays; ) {
    if (await isWorkday(d, q)) {
      const plan = await seedCompletedDay(childId, d, q);
      seeded.push({ date: d, planId: plan.id });
      count++;
    }
    d = addDays(d, 1);
  }
  return seeded;
}

export async function seedCurrentMonthWorkdays(childId, q = query, maxDays = 5) {
  const hk = getHkNow();
  const periodKey = monthPeriodKey(hk.date);
  const [y, m] = periodKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const seeded = [];
  let count = 0;
  for (let day = 1; day <= lastDay && count < maxDays; day++) {
    const d =
      y + "-" + String(m).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    if (await isWorkday(d, q)) {
      const plan = await seedCompletedDay(childId, d, q);
      seeded.push({ date: d, planId: plan.id });
      count++;
    }
  }
  return seeded;
}

async function upsertAssessment(childId, type, periodKey, scheduledDate, wordIds, q) {
  const { rows: existing } = await q(
    `SELECT id, status FROM assessments WHERE child_id = $1 AND type = $2 AND period_key = $3`,
    [childId, type, periodKey]
  );

  if (existing.length) {
    const aid = existing[0].id;
    await q(`DELETE FROM assessment_items WHERE assessment_id = $1`, [aid]);
    await q(
      `
      UPDATE assessments
      SET scheduled_date = $2::date, status = 'scheduled', word_count = $3,
          started_at = NULL, completed_at = NULL
      WHERE id = $1
      `,
      [aid, scheduledDate, wordIds.length]
    );
    await generateItems(aid, wordIds, q, { assessmentType: type });
    const { rows } = await q(
      `SELECT id, type, period_key, scheduled_date, status, word_count FROM assessments WHERE id = $1`,
      [aid]
    );
    return rows[0];
  }

  await q(
    `
    UPDATE assessments SET status = 'expired'
    WHERE child_id = $1 AND type = $2 AND period_key <> $3
      AND status IN ('scheduled', 'in_progress', 'pending_makeup')
    `,
    [childId, type, periodKey]
  );

  const { rows: created } = await q(
    `
    INSERT INTO assessments (child_id, type, period_key, scheduled_date, status, word_count)
    VALUES ($1, $2, $3, $4::date, 'scheduled', $5)
    RETURNING id, type, period_key, scheduled_date, status, word_count
    `,
    [childId, type, periodKey, scheduledDate, wordIds.length]
  );
  await generateItems(created[0].id, wordIds, q, { assessmentType: type });
  return created[0];
}

export async function forceOpenWeekly(childId, q = query) {
  const hk = getHkNow();
  const periodKey = isoWeekKey(hk.date);
  const weekSat = saturdayOfWeek(hk.date);
  const monday = mondayOfWeek(hk.date);
  const friday = fridayOfWeek(hk.date);

  let wordIds = await getWeekCompletedNewWordIds(childId, monday, friday, q);
  if (!wordIds.length) {
    await seedCurrentWeekWorkdays(childId, q);
    wordIds = await getWeekCompletedNewWordIds(childId, monday, friday, q);
  }
  if (!wordIds.length) {
    const err = new Error("No words available for weekly quiz after seeding");
    err.status = 422;
    throw err;
  }

  const row = await upsertAssessment(childId, "weekly", periodKey, weekSat, wordIds, q);
  return { assessment: row, wordCount: wordIds.length, periodKey };
}

export async function forceOpenMonthly(childId, q = query) {
  const hk = getHkNow();
  const periodKey = monthPeriodKey(hk.date);
  const monthSat = lastSaturdayOfMonth(hk.date);

  let wordIds = await getMonthCompletedNewWordIds(childId, periodKey, q);
  if (!wordIds.length) {
    await seedCurrentMonthWorkdays(childId, q);
    wordIds = await getMonthCompletedNewWordIds(childId, periodKey, q);
  }
  if (!wordIds.length) {
    const err = new Error("No words available for monthly test after seeding");
    err.status = 422;
    throw err;
  }

  const row = await upsertAssessment(childId, "monthly", periodKey, monthSat, wordIds, q);
  return { assessment: row, wordCount: wordIds.length, periodKey };
}

export async function bypassAssessmentItems(assessmentId, childId, q = query) {
  const { rows: items } = await q(
    `
    SELECT ai.id, ai.item_type, ai.answer_key
    FROM assessment_items ai
    JOIN assessments a ON a.id = ai.assessment_id
    WHERE ai.assessment_id = $1 AND a.child_id = $2
      AND ai.item_type <> 'sentence'
    `,
    [assessmentId, childId]
  );
  if (!items.length) {
    const err = new Error("Assessment not found or has no items");
    err.status = 404;
    throw err;
  }

  for (const item of items) {
    const answerKey =
      typeof item.answer_key === "string" ? JSON.parse(item.answer_key) : item.answer_key || {};
    let response = {};
    if (item.item_type === "match_meaning" || item.item_type === "match_picture") {
      response = { answer: answerKey.correct || "" };
    } else if (item.item_type === "blank") {
      response = { answer: answerKey.correct || "" };
    }
    await respondToItem(item.id, childId, response, q);
  }

  return completeAssessment(assessmentId, childId, q);
}

async function ensureTestChildCoins(childId, q) {
  await ensurePetSchema(q);
  await q(
    `INSERT INTO child_coin_balances (child_id, coins) VALUES ($1, 0) ON CONFLICT DO NOTHING`,
    [childId]
  );
  await q(
    `
    UPDATE child_coin_balances
    SET coins = $2, updated_at = now()
    WHERE child_id = $1
    `,
    [childId, TEST_CHILD_START_COINS]
  );
  await q(`INSERT INTO child_pet (child_id) VALUES ($1) ON CONFLICT DO NOTHING`, [childId]);
}

async function initChildWordState(client, childId) {
  await client.query(
    `
    INSERT INTO child_word_state (child_id, word_id, status, source)
    SELECT $1, w.id, 'available', 'new'
    FROM words w
    WHERE w.active = TRUE
    ON CONFLICT (child_id, word_id) DO NOTHING
    `,
    [childId]
  );
}

export async function setupTestAccounts(q = query) {
  await ensureTestSchema();
  const parentEmail = parentEmailFromAccountName(TEST_PARENT_ACCOUNT);
  const childEmail = childEmailForParent(parentEmail, TEST_CHILD_NAME);
  const parentHash = await bcrypt.hash(DEFAULT_PARENT_PASSWORD, 10);
  const childHash = await bcrypt.hash(TEST_CHILD_PASSWORD, 10);

  let parentId;
  let childId;

  const { rows: existingParent } = await q(
    `SELECT id FROM users WHERE email = $1`,
    [parentEmail]
  );
  if (existingParent.length) {
    parentId = existingParent[0].id;
    await q(
      `UPDATE users SET is_test_account = TRUE, display_name = COALESCE(NULLIF(display_name, ''), 'Test Parent') WHERE id = $1`,
      [parentId]
    );
  } else {
    const { rows } = await q(
      `
      INSERT INTO users (email, password_hash, role, display_name, is_test_account)
      VALUES ($1, $2, 'parent', 'Test Parent', TRUE)
      RETURNING id
      `,
      [parentEmail, parentHash]
    );
    parentId = rows[0].id;
  }

  const { rows: existingChild } = await q(`SELECT id FROM users WHERE email = $1`, [childEmail]);
  if (existingChild.length) {
    childId = existingChild[0].id;
    await q(`UPDATE users SET is_test_account = TRUE WHERE id = $1`, [childId]);
  } else {
    childId = await withTransaction(async (client) => {
      const { rows: childRows } = await client.query(
        `
        INSERT INTO users (email, password_hash, role, display_name, is_test_account)
        VALUES ($1, $2, 'child', $3, TRUE)
        RETURNING id
        `,
        [childEmail, childHash, TEST_CHILD_NAME]
      );
      const cid = childRows[0].id;
      await client.query(
        `INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [parentId, cid]
      );
      await initChildWordState(client, cid);
      return cid;
    });
  }

  await q(
    `INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [parentId, childId]
  );

  await ensureTestChildCoins(childId, q);

  return {
    parent: {
      accountName: TEST_PARENT_ACCOUNT,
      email: parentEmail,
      password: DEFAULT_PARENT_PASSWORD,
      id: parentId,
    },
    child: {
      displayName: TEST_CHILD_NAME,
      parentAccount: TEST_PARENT_ACCOUNT,
      childName: TEST_CHILD_NAME,
      password: TEST_CHILD_PASSWORD,
      id: childId,
      startCoins: TEST_CHILD_START_COINS,
    },
  };
}
