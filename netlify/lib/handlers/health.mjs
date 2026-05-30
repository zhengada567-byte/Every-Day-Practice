import { query } from "../db.mjs";
import { ok, json, corsHeaders } from "../http.mjs";

function configStatus() {
  return {
    databaseUrl: !!process.env.DATABASE_URL,
    jwtSecret: !!process.env.JWT_SECRET,
    adminApiKey: !!process.env.ADMIN_API_KEY,
    moonshotApiKey: !!process.env.MOONSHOT_API_KEY,
  };
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
    return json(
      503,
      {
        ok: false,
        error: err.message || "Database connection failed",
        config,
      },
      corsHeaders(event)
    );
  }
}
