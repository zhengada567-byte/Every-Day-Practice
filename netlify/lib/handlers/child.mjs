import { query } from "../db.mjs";
import { buildTodayPayload } from "../daily.mjs";
import { ok } from "../http.mjs";

export async function getToday(event, childAuth) {
  const payload = await buildTodayPayload(childAuth.sub, query);
  return ok(event, payload);
}
