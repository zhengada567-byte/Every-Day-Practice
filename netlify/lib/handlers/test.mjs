import { query } from "../db.mjs";
import { getHkNow } from "../calendar.mjs";
import {
  advancePhase,
  buildTodayPayload,
  fetchPlanDetail,
  startDailyPlan,
} from "../daily.mjs";
import { fetchBlockingAssessment, getAssessmentDetail } from "../assessments.mjs";
import { ok } from "../http.mjs";
import {
  bypassAssessmentItems,
  finishDailyPlanAllPhases,
  forceOpenMonthly,
  forceOpenWeekly,
  requireTestChild,
  seedCurrentWeekWorkdays,
} from "../test-harness.mjs";

export async function startDaily(event, childAuth) {
  await requireTestChild(childAuth.sub, query);
  const hk = getHkNow();
  const { rows } = await query(
    `SELECT id FROM daily_plans WHERE child_id = $1 AND plan_date = $2::date`,
    [childAuth.sub, hk.date]
  );
  let plan;
  if (rows.length) {
    plan = await fetchPlanDetail(rows[0].id, childAuth.sub, query);
  } else {
    plan = await startDailyPlan(childAuth.sub, query, { testMode: true });
  }
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { plan, today }, rows.length ? 200 : 201);
}

export async function bypassPhase(event, childAuth, body) {
  await requireTestChild(childAuth.sub, query);
  const planId = body.planId;
  if (!planId) {
    const err = new Error("planId is required");
    err.status = 400;
    throw err;
  }
  const row = await query(
    `SELECT phase, status FROM daily_plans WHERE id = $1 AND child_id = $2`,
    [planId, childAuth.sub]
  );
  if (!row.rows.length) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }
  const { phase, status } = row.rows[0];
  if (status !== "in_progress" || !["learn", "l1", "l2", "l3"].includes(phase)) {
    const err = new Error("Plan is not in a skippable phase");
    err.status = 422;
    throw err;
  }
  const plan = await advancePhase(planId, childAuth.sub, phase, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { plan, today });
}

export async function finishDaily(event, childAuth, body) {
  await requireTestChild(childAuth.sub, query);
  let planId = body.planId;
  if (!planId) {
    const hk = getHkNow();
    const { rows } = await query(
      `SELECT id FROM daily_plans WHERE child_id = $1 AND plan_date = $2::date`,
      [childAuth.sub, hk.date]
    );
    if (!rows.length) {
      const err = new Error("No plan for today — start daily first");
      err.status = 404;
      throw err;
    }
    planId = rows[0].id;
  }
  const plan = await finishDailyPlanAllPhases(planId, childAuth.sub, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { plan, today });
}

export async function seedWeek(event, childAuth) {
  await requireTestChild(childAuth.sub, query);
  const seeded = await seedCurrentWeekWorkdays(childAuth.sub, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { seeded, today });
}

export async function openWeekly(event, childAuth) {
  await requireTestChild(childAuth.sub, query);
  const result = await forceOpenWeekly(childAuth.sub, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { ...result, today });
}

export async function openMonthly(event, childAuth) {
  await requireTestChild(childAuth.sub, query);
  const result = await forceOpenMonthly(childAuth.sub, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { ...result, today });
}

export async function bypassAssessment(event, childAuth, body) {
  await requireTestChild(childAuth.sub, query);
  let assessmentId = body.assessmentId;
  if (!assessmentId) {
    const blocking = await fetchBlockingAssessment(childAuth.sub, query);
    if (!blocking) {
      const err = new Error("No active quiz or test");
      err.status = 404;
      throw err;
    }
    assessmentId = blocking.id;
  }
  const summary = await bypassAssessmentItems(assessmentId, childAuth.sub, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { summary, today });
}

export async function status(event, childAuth) {
  await requireTestChild(childAuth.sub, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  let currentAssessment = null;
  if (today.blockingAssessment) {
    currentAssessment = await getAssessmentDetail(
      today.blockingAssessment.id,
      childAuth.sub,
      query
    );
  }
  return ok(event, { today, currentAssessment });
}
