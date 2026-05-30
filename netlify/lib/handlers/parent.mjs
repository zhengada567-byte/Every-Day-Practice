import bcrypt from "bcryptjs";
import { query, withTransaction } from "../db.mjs";
import { publicUser } from "../auth.mjs";
import { buildTodayPayload } from "../daily.mjs";
import { ok } from "../http.mjs";

async function assertParentOwnsChild(parentId, childId) {
  const { rows } = await query(
    "SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2",
    [parentId, childId]
  );
  if (!rows.length) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

async function initChildWordState(client, childId) {
  await client.query(
    `
    INSERT INTO child_word_state (child_id, word_id, status, source)
    SELECT $1, w.id, 'available', 'new'
    FROM words w
    WHERE w.active = TRUE
    ON CONFLICT (child_id, word_id) DO NOTHING
    `,
    [childId]
  );
}

export async function createChild(event, parentAuth, body) {
  const displayName = (body.displayName || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!displayName || !email || password.length < 8) {
    const err = new Error("displayName, email, and password (8+) are required");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const child = await withTransaction(async (client) => {
    let inserted;
    try {
      inserted = await client.query(
        `
        INSERT INTO users (email, password_hash, role, display_name)
        VALUES ($1, $2, 'child', $3)
        RETURNING id, email, role, display_name, created_at, last_login_at
        `,
        [email, passwordHash, displayName]
      );
    } catch (err) {
      if (err.code === "23505") {
        const dup = new Error("Email already in use");
        dup.status = 409;
        throw dup;
      }
      throw err;
    }
    const row = inserted.rows[0];
    await client.query(
      "INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2)",
      [parentAuth.sub, row.id]
    );
    await initChildWordState(client, row.id);
    return row;
  });

  return ok(event, { child: publicUser(child) }, 201);
}

export async function listChildren(event, parentAuth) {
  const { rows } = await query(
    `
    SELECT u.id, u.email, u.role, u.display_name, u.created_at, u.last_login_at
    FROM parent_children pc
    JOIN users u ON u.id = pc.child_id
    WHERE pc.parent_id = $1
    ORDER BY u.display_name
    `,
    [parentAuth.sub]
  );
  return ok(event, { children: rows.map(publicUser) });
}

export async function childDashboard(event, parentAuth, childId) {
  await assertParentOwnsChild(parentAuth.sub, childId);
  const today = await buildTodayPayload(childId, query);

  const { rows: counts } = await query(
    `
    SELECT status, COUNT(*)::int AS n
    FROM child_word_state
    WHERE child_id = $1
    GROUP BY status
    `,
    [childId]
  );
  const mastery = { available: 0, assigned: 0, mastered: 0 };
  for (const row of counts) {
    mastery[row.status] = row.n;
  }

  return ok(event, { childId, today, mastery });
}

export async function childReports(event, parentAuth, childId) {
  await assertParentOwnsChild(parentAuth.sub, childId);
  const params = event.queryStringParameters || {};
  const type = params.type;
  const limit = Math.min(Math.max(parseInt(params.limit || "20", 10) || 20, 1), 50);

  const args = [childId];
  let sql = `
    SELECT r.id, r.report_type, r.period_key, r.summary, r.created_at,
           a.scheduled_date, a.word_count
    FROM reports r
    LEFT JOIN assessments a ON a.id = r.assessment_id
    WHERE r.child_id = $1
  `;
  if (type) {
    args.push(type);
    sql += ` AND r.report_type = $${args.length}`;
  }
  args.push(limit);
  sql += ` ORDER BY r.created_at DESC LIMIT $${args.length}`;

  const { rows } = await query(sql, args);
  const reports = rows.map(function (row) {
    const summary =
      typeof row.summary === "string" ? JSON.parse(row.summary) : row.summary || {};
    return {
      id: row.id,
      reportType: row.report_type,
      periodKey: row.period_key,
      scheduledDate: row.scheduled_date,
      wordCount: row.word_count,
      summary: summary,
      createdAt: row.created_at,
    };
  });

  return ok(event, { reports: reports });
}
