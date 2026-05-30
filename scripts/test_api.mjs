/**
 * Smoke test for API. Requires: npm run dev (port 8888), ADMIN_API_KEY in env.
 */
import "../netlify/lib/load-env.mjs";

const BASE = process.env.API_BASE || "http://localhost:8888/api/v1";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";
const stamp = Date.now();

async function req(method, path, { token, body, headers: extra } = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log("API base:", BASE);
  if (!ADMIN_KEY) {
    throw new Error("Set ADMIN_API_KEY in .env or env.txt");
  }

  const health = await req("GET", "/health");
  console.log("health:", health);

  const accountName = `parent${stamp}`;
  const parent = await req("POST", "/admin/parents", {
    headers: { "X-Admin-Key": ADMIN_KEY },
    body: { accountName, displayName: "Test Parent" },
  });
  console.log("admin created parent:", parent.user.email);

  const parentLogin = await req("POST", "/auth/login", {
    body: { email: parent.user.email, password: "qwer1234" },
  });
  console.log("parent login ok");

  const child = await req("POST", "/parent/children", {
    token: parentLogin.token,
    body: { displayName: "Alex", password: "childpass1" },
  });
  console.log("created child:", child.child.displayName);

  const childLogin = await req("POST", "/auth/child-login", {
    body: { parentAccount: accountName, childName: "Alex", password: "childpass1" },
  });
  console.log("child login ok:", childLogin.user.role);

  const today = await req("GET", "/child/today", { token: childLogin.token });
  console.log("child/today:", today.date);

  const dash = await req("GET", `/parent/children/${child.child.id}/dashboard`, {
    token: parentLogin.token,
  });
  console.log("parent dashboard mastery:", dash.mastery);

  console.log("\nAll API smoke tests passed.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
