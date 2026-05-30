import { getHkNow } from "../calendar.mjs";
import { query } from "../db.mjs";
import {
  fetchCalendarDay,
  fetchCalendarMonth,
  replayAssessment,
  replayDailyPlan,
} from "../calendar-view.mjs";
import { ok } from "../http.mjs";

export async function getMonth(event, childAuth) {
  const qs = event.queryStringParameters || {};
  let year = qs.year || qs.y;
  let month = qs.month || qs.m;
  if (!year || !month) {
    const hk = getHkNow();
    year = hk.date.slice(0, 4);
    month = hk.date.slice(5, 7);
  }
  const data = await fetchCalendarMonth(childAuth.sub, year, Number(month), query);
  return ok(event, data);
}

export async function getDay(event, childAuth) {
  const qs = event.queryStringParameters || {};
  const date = qs.date;
  const data = await fetchCalendarDay(childAuth.sub, date, query);
  return ok(event, data);
}

export async function replayPlan(event, childAuth, planId) {
  const data = await replayDailyPlan(planId, childAuth.sub, query);
  return ok(event, data);
}

export async function replayQuiz(event, childAuth, assessmentId) {
  const data = await replayAssessment(assessmentId, childAuth.sub, query);
  return ok(event, data);
}
