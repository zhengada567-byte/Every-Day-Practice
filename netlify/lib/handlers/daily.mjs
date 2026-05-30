import { query } from "../db.mjs";
import {
  advancePhase,
  fetchLearnWords,
  fetchPlanDetail,
  fetchPracticeWords,
  startDailyPlan,
} from "../daily.mjs";
import { buildTodayPayload } from "../daily.mjs";
import { ok } from "../http.mjs";

export async function startPlan(event, childAuth) {
  const plan = await startDailyPlan(childAuth.sub, query);
  const today = await buildTodayPayload(childAuth.sub, query);
  return ok(event, { plan, today }, 201);
}

export async function getPlan(event, childAuth, planId) {
  const plan = await fetchPlanDetail(planId, childAuth.sub, query);
  if (!plan) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }
  return ok(event, { plan });
}

export async function getLearnWords(event, childAuth, planId) {
  const data = await fetchLearnWords(planId, childAuth.sub, query);
  if (!data) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }
  return ok(event, data);
}

export async function getPractice(event, childAuth, planId, phase) {
  if (!["l1", "l2", "l3"].includes(phase)) {
    const err = new Error("Invalid phase");
    err.status = 400;
    throw err;
  }
  const data = await fetchPracticeWords(planId, childAuth.sub, phase, query);
  if (!data) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }
  return ok(event, data);
}

export async function completePhase(event, childAuth, planId, body) {
  const phase = body.phase;
  if (!["learn", "l1", "l2", "l3"].includes(phase)) {
    const err = new Error("Invalid phase");
    err.status = 400;
    throw err;
  }
  const plan = await advancePhase(planId, childAuth.sub, phase, query);
  return ok(event, { plan });
}
