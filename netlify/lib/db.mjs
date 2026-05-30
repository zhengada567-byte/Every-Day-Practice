import pg from "pg";

const { Pool } = pg;

let pool;

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
    pool = new Pool({
      connectionString: url,
      ssl:
        url.includes("localhost") || url.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false },
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
