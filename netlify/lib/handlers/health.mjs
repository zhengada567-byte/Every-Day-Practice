import { query } from "../db.mjs";
import { ok } from "../http.mjs";

export async function health(event) {
  const { rows } = await query("SELECT COUNT(*)::int AS n FROM words");
  return ok(event, {
    ok: true,
    words: rows[0].n,
    time: new Date().toISOString(),
  });
}
