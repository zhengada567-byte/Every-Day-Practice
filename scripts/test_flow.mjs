/**
 * End-to-end test flow: admin setup → child daily → weekly quiz → monthly test.
 * Requires: npm run dev, ADMIN_API_KEY in env.txt / .env
 */
import "../netlify/lib/load-env.mjs";

const BASE = process.env.API_BASE || "http://localhost:8888/api/v1";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

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
  if (!ADMIN_KEY) throw new Error("Set ADMIN_API_KEY in env.txt");

  console.log("1. Admin: create test accounts");
  const setup = await req("POST", "/admin/test/setup", {
    headers: { "X-Admin-Key": ADMIN_KEY },
  });
  const { parent, child } = setup.accounts;
  console.log("   parent:", parent.email, "child:", child.displayName);

  console.log("2. Child login");
  const login = await req("POST", "/auth/child-login", {
    body: {
      parentAccount: child.parentAccount,
      childName: child.childName,
      password: child.password,
    },
  });
  const token = login.token;
  console.log("   testMode:", login.user.testMode);

  console.log("3. Seed week + start & finish today (bypass)");
  await req("POST", "/child/test/seed-week", { token });
  let started = await req("POST", "/child/test/start-daily", { token });
  if (started.plan.status !== "completed") {
    started = await req("POST", "/child/test/finish-daily", {
      token,
      body: { planId: started.plan.id },
    });
  }
  console.log("   daily completed");

  console.log("4. Open weekly quiz and bypass");
  const weekly = await req("POST", "/child/test/open-weekly", { token });
  const weeklyId = weekly.assessment.id;
  await req("POST", "/child/test/bypass-assessment", {
    token,
    body: { assessmentId: weeklyId },
  });
  console.log("   weekly done");

  console.log("5. Open monthly test and bypass");
  const monthly = await req("POST", "/child/test/open-monthly", { token });
  await req("POST", "/child/test/bypass-assessment", {
    token,
    body: { assessmentId: monthly.assessment.id },
  });
  console.log("   monthly done");

  const status = await req("GET", "/child/test/status", { token });
  console.log("6. Status:", {
    date: status.today.date,
    blocking: status.today.blockingAssessment,
    canStartDaily: status.today.canStartDaily,
  });

  console.log("\nTest flow passed.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
