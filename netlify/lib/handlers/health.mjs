import { query } from "../db.mjs";
import { ok, json, corsHeaders } from "../http.mjs";

function safeDbHost() {
  const raw = process.env.DATABASE_URL || "";
  if (!raw) return null;
  try {
    const u = new URL(raw.replace(/^postgres(ql)?:/, "http:"));
    return u.hostname || "invalid-url";
  } catch {
    return "invalid-url";
  }
}

function configStatus() {
  const host = safeDbHost();
  return {
    databaseUrl: !!process.env.DATABASE_URL,
    databaseHost: host,
    usesDirectSupabaseHost: !!host && /^db\.[^.]+\.supabase\.co$/i.test(host),
    jwtSecret: !!process.env.JWT_SECRET,
    adminApiKey: !!process.env.ADMIN_API_KEY,
    moonshotApiKey: !!process.env.MOONSHOT_API_KEY,
  };
}

function connectionHint(message, config) {
  const msg = message || "";
  if (/ENOTFOUND.*db\.[^.]+\.supabase\.co/i.test(msg) || config.usesDirectSupabaseHost) {
    return (
      "Direct db.*.supabase.co is IPv6-only and often fails on Netlify. " +
      "In Supabase Dashboard → Connect → use Transaction pooler (port 6543), " +
      "copy the full postgresql:// URI into Netlify DATABASE_URL, then redeploy."
    );
  }
  if (/tenant or user not found/i.test(msg)) {
    return (
      "Database password or pooler URI is wrong. Supabase → Project Settings → Database → " +
      "Reset database password, then copy Connection string → URI (Transaction pooler) into Netlify."
    );
  }
  if (/password authentication failed/i.test(msg)) {
    return "Wrong database password in DATABASE_URL. Reset it in Supabase and update Netlify.";
  }
  return null;
}

export async function health(event) {
  const config = configStatus();
  if (!config.databaseUrl) {
    return json(
      503,
      {
        ok: false,
        error:
          "DATABASE_URL is not set. Add it in Netlify site settings → Environment variables, or env.txt for npm run dev.",
        config,
      },
      corsHeaders(event)
    );
  }

  try {
    const { rows } = await query("SELECT COUNT(*)::int AS n FROM words");
    return ok(event, {
      ok: true,
      words: rows[0].n,
      time: new Date().toISOString(),
      config,
    });
  } catch (err) {
    console.error(err);
    const message = err.message || "Database connection failed";
    const hint = connectionHint(message, config);
    return json(
      503,
      {
        ok: false,
        error: message,
        ...(hint ? { hint } : {}),
        config,
      },
      corsHeaders(event)
    );
  }
}
