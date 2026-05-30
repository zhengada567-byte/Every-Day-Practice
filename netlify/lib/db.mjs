import pg from "pg";

const { Pool } = pg;

let pool;

function isLocalDatabaseUrl(url) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

/** pg v8+ treats sslmode=require in the URL as verify-full; Supabase pooler needs relaxed TLS. */
function poolConnectionString(url) {
  if (isLocalDatabaseUrl(url)) return url;
  try {
    const normalized = url.replace(/^postgres(ql)?:/, "https:");
    const parsed = new URL(normalized);
    parsed.searchParams.delete("sslmode");
    return `postgresql://${parsed.username}:${parsed.password}@${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}${parsed.search}`;
  } catch {
    return url.replace(/([?&])sslmode=[^&]*&?/g, "$1").replace(/[?&]$/, "");
  }
}

export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      const err = new Error(
        "Database is not configured. Set DATABASE_URL in Netlify environment variables or env.txt for local dev."
      );
      err.status = 503;
      throw err;
    }
    const local = isLocalDatabaseUrl(url);
    pool = new Pool({
      connectionString: poolConnectionString(url),
      ssl: local ? false : { rejectUnauthorized: false },
      max: 4,
    });
  }
  return pool;
}

export async function query(text, params) {
  return getPool().query(text, params);
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
