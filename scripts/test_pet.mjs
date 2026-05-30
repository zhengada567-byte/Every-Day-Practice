import "../netlify/lib/load-env.mjs";
import { query } from "../netlify/lib/db.mjs";
import { getPetState } from "../netlify/lib/pet.mjs";

const { rows } = await query(
  "SELECT id FROM users WHERE role = 'child' LIMIT 1"
);
if (!rows[0]) {
  console.log("No child user");
  process.exit(0);
}
const state = await getPetState(rows[0].id, query);
console.log("OK", JSON.stringify(state, null, 2));
