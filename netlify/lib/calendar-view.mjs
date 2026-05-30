import { getHkNow } from "./calendar.mjs";
import { fetchPlanDetail } from "./daily.mjs";
import { getAssessmentDetail } from "./assessments.mjs";

function padMonth(month) {
  return String(month).padStart(2, "0");
}

function monthBounds(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!y || m < 1 || m > 12) {
    const err = new Error("Invalid year or month");
    err.status = 400;
    throw err;
  }
  const start = `${y}-${padMonth(m)}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${padMonth(m)}-${String(lastDay).padStart(2, "0")}`;
  return { year: y, month: m, start, end };
}

function parseDateParam(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) {
    const err = new Error("Invalid date (use YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }
  return dateStr;
}

/** Days in month with completion flags for calendar dots. */
export async function fetchCalendarMonth(childId, year, month, query) {
  const bounds = monthBounds(year, month);
  const days = {};

  const { rows: dailyRows } = await query(
    `
    SELECT plan_date::text AS d
    FROM daily_plans
    WHERE child_id = $1
      AND status = 'completed'
      AND plan_date >= $2::date
      AND plan_date <= $3::date
    `,
    [childId, bounds.start, bounds.end]
  );
  dailyRows.forEach((r) => {
    if (!days[r.d]) days[r.d] = { daily: false, weekly: false, monthly: false };
    days[r.d].daily = true;
  });

  const { rows: assessRows } = await query(
    `
    SELECT
      (completed_at AT TIME ZONE 'Asia/Hong_Kong')::date::text AS d,
      type
    FROM assessments
    WHERE child_id = $1
      AND status = 'completed'
      AND completed_at IS NOT NULL
      AND (completed_at AT TIME ZONE 'Asia/Hong_Kong')::date >= $2::date
      AND (completed_at AT TIME ZONE 'Asia/Hong_Kong')::date <= $3::date
    `,
    [childId, bounds.start, bounds.end]
  );
  assessRows.forEach((r) => {
    if (!days[r.d]) days[r.d] = { daily: false, weekly: false, monthly: false };
    if (r.type === "weekly") days[r.d].weekly = true;
    if (r.type === "monthly") days[r.d].monthly = true;
  });

  Object.keys(days).forEach((d) => {
    const entry = days[d];
    entry.completed = entry.daily || entry.weekly || entry.monthly;
  });

  const hk = getHkNow();
  return {
    year: bounds.year,
    month: bounds.month,
    start: bounds.start,
    end: bounds.end,
    today: hk.date,
    days,
  };
}

/** Activities completed on a single day (for click / redo). */
export async function fetchCalendarDay(childId, dateStr, query) {
  const date = parseDateParam(dateStr);
  const activities = [];

  const { rows: plans } = await query(
    `
    SELECT id, plan_date::text AS plan_date, status, phase, completed_at
    FROM daily_plans
    WHERE child_id = $1 AND plan_date = $2::date AND status = 'completed'
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 1
    `,
    [childId, date]
  );
  if (plans.length) {
    const p = plans[0];
    activities.push({
      kind: "daily",
      id: p.id,
      label: "每日单词 · Daily words",
      status: p.status,
      phase: p.phase,
      completedAt: p.completed_at,
    });
  }

  const { rows: assessments } = await query(
    `
    SELECT id, type, period_key, status, word_count, completed_at
    FROM assessments
    WHERE child_id = $1
      AND status = 'completed'
      AND completed_at IS NOT NULL
      AND (completed_at AT TIME ZONE 'Asia/Hong_Kong')::date = $2::date
    ORDER BY completed_at
    `,
    [childId, date]
  );
  assessments.forEach((a) => {
    activities.push({
      kind: a.type,
      id: a.id,
      label:
        a.type === "monthly" ? "每月测试 · Monthly test" : "每周测验 · Weekly quiz",
      status: a.status,
      periodKey: a.period_key,
      wordCount: a.word_count,
      completedAt: a.completed_at,
    });
  });

  return { date, activities };
}

export async function replayDailyPlan(planId, childId, query) {
  const { rows } = await query(
    `
    UPDATE daily_plans
    SET status = 'in_progress', phase = 'learn', completed_at = NULL
    WHERE id = $1 AND child_id = $2 AND status = 'completed'
    RETURNING id
    `,
    [planId, childId]
  );
  if (!rows.length) {
    const err = new Error("Completed daily plan not found");
    err.status = 404;
    throw err;
  }
  const plan = await fetchPlanDetail(planId, childId, query);
  return { plan };
}

export async function replayAssessment(assessmentId, childId, query) {
  const { rows } = await query(
    `
    SELECT id, status FROM assessments
    WHERE id = $1 AND child_id = $2 AND status = 'completed'
    `,
    [assessmentId, childId]
  );
  if (!rows.length) {
    const err = new Error("Completed quiz or test not found");
    err.status = 404;
    throw err;
  }

  await query(
    `
    DELETE FROM assessment_responses ar
    USING assessment_items ai
    WHERE ar.assessment_item_id = ai.id
      AND ai.assessment_id = $1
      AND ar.child_id = $2
    `,
    [assessmentId, childId]
  );

  await query(
    `
    UPDATE assessments
    SET status = 'in_progress', completed_at = NULL
    WHERE id = $1 AND child_id = $2
    `,
    [assessmentId, childId]
  );

  const assessment = await getAssessmentDetail(assessmentId, childId, query);
  return { assessment };
}
