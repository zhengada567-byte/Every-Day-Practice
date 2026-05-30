import { query } from "../db.mjs";
import { buildTodayPayload } from "../daily.mjs";
import { ok } from "../http.mjs";
import {
  forceOpenMonthly,
  forceOpenWeekly,
  seedCurrentWeekWorkdays,
  setupTestAccounts,
} from "../test-harness.mjs";

function assertAdmin(event, body) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    const err = new Error("Admin API is not configured");
    err.status = 503;
    throw err;
  }
  const header = event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "";
  const fromBody = body && body.adminKey ? body.adminKey : "";
  if (header !== expected && fromBody !== expected) {
    const err = new Error("Invalid admin key");
    err.status = 403;
    throw err;
  }
}

export async function setup(event, body) {
  assertAdmin(event, body);
  const accounts = await setupTestAccounts(query);
  return ok(event, { accounts }, 201);
}

export async function seedWeek(event, body) {
  assertAdmin(event, body);
  const childId = body.childId;
  if (!childId) {
    const err = new Error("childId is required");
    err.status = 400;
    throw err;
  }
  const seeded = await seedCurrentWeekWorkdays(childId, query);
  const today = await buildTodayPayload(childId, query);
  return ok(event, { seeded, today });
}

export async function openWeekly(event, body) {
  assertAdmin(event, body);
  const childId = body.childId;
  if (!childId) {
    const err = new Error("childId is required");
    err.status = 400;
    throw err;
  }
  const result = await forceOpenWeekly(childId, query);
  const today = await buildTodayPayload(childId, query);
  return ok(event, { ...result, today });
}

export async function openMonthly(event, body) {
  assertAdmin(event, body);
  const childId = body.childId;
  if (!childId) {
    const err = new Error("childId is required");
    err.status = 400;
    throw err;
  }
  const result = await forceOpenMonthly(childId, query);
  const today = await buildTodayPayload(childId, query);
  return ok(event, { ...result, today });
}
