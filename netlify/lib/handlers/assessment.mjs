import { query } from "../db.mjs";
import {
  completeAssessment,
  getAssessmentDetail,
  getCurrentAssessment,
  respondToItem,
  startAssessment,
} from "../assessments.mjs";
import { ok } from "../http.mjs";

export async function getCurrent(event, childAuth) {
  const data = await getCurrentAssessment(childAuth.sub, query);
  return ok(event, { assessment: data });
}

export async function getById(event, childAuth, id) {
  const data = await getAssessmentDetail(id, childAuth.sub, query);
  if (!data) {
    const err = new Error("Assessment not found");
    err.status = 404;
    throw err;
  }
  return ok(event, { assessment: data });
}

export async function start(event, childAuth, id) {
  const data = await startAssessment(id, childAuth.sub, query);
  return ok(event, { assessment: data });
}

export async function respond(event, childAuth, id, body) {
  if (!body.itemId) {
    const err = new Error("itemId is required");
    err.status = 400;
    throw err;
  }
  const result = await respondToItem(body.itemId, childAuth.sub, body.response || {}, query);
  return ok(event, result);
}

export async function complete(event, childAuth, id) {
  const result = await completeAssessment(id, childAuth.sub, query);
  return ok(event, result);
}
