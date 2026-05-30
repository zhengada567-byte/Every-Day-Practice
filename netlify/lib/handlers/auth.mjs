import bcrypt from "bcryptjs";
import { query } from "../db.mjs";
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

export async function register(event, body) {
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const displayName = (body.displayName || "").trim();
  const role = body.role || "parent";

  if (!validateEmail(email)) {
    const err = new Error("Valid email is required");
    err.status = 400;
    throw err;
  }
  if (!validatePassword(password)) {
    const err = new Error("Password must be at least 8 characters");
    err.status = 400;
    throw err;
  }
  if (!displayName) {
    const err = new Error("displayName is required");
    err.status = 400;
    throw err;
  }
  if (role !== "parent") {
    const err = new Error("Only parent registration is allowed here");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let rows;
  try {
    ({ rows } = await query(
      `
      INSERT INTO users (email, password_hash, role, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role, display_name, created_at, last_login_at
      `,
      [email, passwordHash, role, displayName]
    ));
  } catch (err) {
    if (err.code === "23505") {
      const dup = new Error("Email already registered");
      dup.status = 409;
      throw dup;
    }
    throw err;
  }

  const user = rows[0];
  const token = signToken(user);
  return ok(
    event,
    { user: publicUser(user), token },
    201,
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

  await query("UPDATE users SET last_login_at = now() WHERE id = $1", [user.id]);
  const token = signToken(user);
  return ok(
    event,
    { user: publicUser(user), token },
    200,
    { "Set-Cookie": sessionCookie(token, isSecure(event)) }
  );
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
