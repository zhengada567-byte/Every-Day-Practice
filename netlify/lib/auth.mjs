import jwt from "jsonwebtoken";

const COOKIE_NAME = "ewp_session";
const TOKEN_TTL = "7d";

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET is not set");
  }
  return value;
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
      displayName: user.display_name,
    },
    secret(),
    { expiresIn: TOKEN_TTL }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

export function readBearer(event) {
  const header = event.headers.authorization || event.headers.Authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

export function readCookie(event, name = COOKIE_NAME) {
  const raw = event.headers.cookie || event.headers.Cookie || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function sessionToken(event) {
  return readBearer(event) || readCookie(event);
}

export function authUser(event) {
  const token = sessionToken(event);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(event) {
  const user = authUser(event);
  if (!user) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return user;
}

export function requireRole(event, role) {
  const user = requireAuth(event);
  if (user.role !== role) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return user;
}

export function sessionCookie(token, secure) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function clearSessionCookie(secure) {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
