import bcrypt from "bcryptjs";
import { query } from "../db.mjs";
import {
  childEmailForParent,
  resolveParentEmail,
} from "../accounts.mjs";
import {
  clearSessionCookie,
  publicUser,
  sessionCookie,
  signToken,
} from "../auth.mjs";
import { isSecure, ok, noContent, corsHeaders } from "../http.mjs";

function validateEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return typeof password === "string" && password.length >= 8;
}

export async function register(_event, _body) {
  const err = new Error(
    "Parent sign-up is disabled. Ask your admin to create a parent account."
  );
  err.status = 403;
  throw err;
}

async function loginUserRow(user, event) {
  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  const token = signToken(user);
  return ok(
    event,
    { user: publicUser(user), token },
    200,
    { "Set-Cookie": sessionCookie(token, isSecure(event)) }
  );
}

export async function login(event, body) {
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!validateEmail(email) || !password) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const { rows } = await query(
    `
    SELECT id, email, password_hash, role, display_name, created_at, last_login_at
    FROM users WHERE email = $1
    `,
    [email]
  );
  if (!rows.length) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const err = new Error("Invalid email or password");
    err.status = 401;
    throw err;
  }

  return loginUserRow(user, event);
}

/** Child login: parent account name + child display name + password. */
export async function childLogin(event, body) {
  const parentAccount = (body.parentAccount || body.parent || "").trim();
  const childName = (body.childName || body.child || body.displayName || "").trim();
  const password = body.password || "";

  if (!parentAccount || !childName || !password) {
    const err = new Error("Parent account, child name, and password are required");
    err.status = 400;
    throw err;
  }

  const parentEmail = resolveParentEmail(parentAccount);
  const childEmail = childEmailForParent(parentEmail, childName);

  const { rows: parentRows } = await query(
    `SELECT id FROM users WHERE email = $1 AND role = 'parent'`,
    [parentEmail]
  );
  if (!parentRows.length) {
    const err = new Error("Invalid parent account, child name, or password");
    err.status = 401;
    throw err;
  }

  const { rows } = await query(
    `
    SELECT u.id, u.email, u.password_hash, u.role, u.display_name, u.created_at, u.last_login_at
    FROM users u
    JOIN parent_children pc ON pc.child_id = u.id
    WHERE u.email = $1 AND u.role = 'child' AND pc.parent_id = $2
    `,
    [childEmail, parentRows[0].id]
  );
  if (!rows.length) {
    const err = new Error("Invalid parent account, child name, or password");
    err.status = 401;
    throw err;
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const err = new Error("Invalid parent account, child name, or password");
    err.status = 401;
    throw err;
  }

  return loginUserRow(user, event);
}

/** Parent changes own password (must be logged in as parent). */
export async function changePassword(event, auth, body) {
  if (auth.role !== "parent") {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  const currentPassword = body.currentPassword || body.password || "";
  const newPassword = body.newPassword || "";
  if (!currentPassword || !validatePassword(newPassword)) {
    const err = new Error("Current password and new password (8+) are required");
    err.status = 400;
    throw err;
  }

  const { rows } = await query(
    `SELECT password_hash FROM users WHERE id = $1 AND role = 'parent'`,
    [auth.sub]
  );
  if (!rows.length) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) {
    const err = new Error("Current password is wrong");
    err.status = 401;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [auth.sub, passwordHash]);
  return ok(event, { ok: true });
}

export async function logout(event) {
  return noContent({
    ...corsHeaders(event),
    "Set-Cookie": clearSessionCookie(isSecure(event)),
  });
}

export async function me(event, auth) {
  const { rows } = await query(
    `
    SELECT id, email, role, display_name, created_at, last_login_at
    FROM users WHERE id = $1
    `,
    [auth.sub]
  );
  if (!rows.length) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return ok(event, { user: publicUser(rows[0]) });
}
