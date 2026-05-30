/**
 * Smoke test for Step 2 API. Requires: npm run dev (port 8888).
 */
const BASE = process.env.API_BASE || "http://localhost:8888/api/v1";
const stamp = Date.now();

async function req(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
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

  const health = await req("GET", "/health");
  console.log("health:", health);

  const parentEmail = `parent.${stamp}@example.com`;
  const childEmail = `child.${stamp}@example.com`;
  const password = "password123";

  const reg = await req("POST", "/auth/register", {
    body: {
      email: parentEmail,
      password,
      displayName: "Test Parent",
      role: "parent",
    },
  });
  console.log("registered parent:", reg.user.email);

  const child = await req("POST", "/parent/children", {
    token: reg.token,
    body: {
      email: childEmail,
      password,
      displayName: "Test Child",
    },
  });
  console.log("created child:", child.child.email);

  const login = await req("POST", "/auth/login", {
    body: { email: childEmail, password },
  });
  console.log("child login ok:", login.user.role);

  const today = await req("GET", "/child/today", { token: login.token });
  console.log("child/today:", today);

  const start = await req("POST", "/child/daily-plan/start", { token: login.token });
  console.log("daily-plan/start:", start.plan.newWordCount, "new,", start.plan.reviewWordCount, "review");

  const dash = await req("GET", `/parent/children/${child.child.id}/dashboard`, {
    token: reg.token,
  });
  console.log("parent dashboard mastery:", dash.mastery);

  console.log("\nAll API smoke tests passed.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
