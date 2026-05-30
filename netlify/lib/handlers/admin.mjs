import bcrypt from "bcryptjs";
import { query } from "../db.mjs";
import {
  DEFAULT_PARENT_PASSWORD,
  parentEmailFromAccountName,
} from "../accounts.mjs";
import { publicUser } from "../auth.mjs";
import { ok } from "../http.mjs";

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

export async function createParent(event, body) {
  assertAdmin(event, body);
  const accountName = (body.accountName || body.account || "").trim();
  const displayName = (body.displayName || accountName || "").trim();
  const password = body.password || DEFAULT_PARENT_PASSWORD;

  if (!accountName) {
    const err = new Error("accountName is required (e.g. parentada)");
    err.status = 400;
    throw err;
  }
  if (password.length < 8) {
    const err = new Error("Password must be at least 8 characters");
    err.status = 400;
    throw err;
  }

  const email = parentEmailFromAccountName(accountName);
  const passwordHash = await bcrypt.hash(password, 10);

  let rows;
  try {
    ({ rows } = await query(
      `
      INSERT INTO users (email, password_hash, role, display_name)
      VALUES ($1, $2, 'parent', $3)
      RETURNING id, email, role, display_name, created_at, last_login_at
      `,
      [email, passwordHash, displayName]
    ));
  } catch (err) {
    if (err.code === "23505") {
      const dup = new Error("Parent account already exists");
      dup.status = 409;
      throw dup;
    }
    throw err;
  }

  return ok(
    event,
    {
      user: publicUser(rows[0]),
      accountName: accountName,
      defaultPasswordUsed: !body.password,
    },
    201
  );
}
