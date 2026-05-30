import { getHkNow, isWorkday, mapWordRow } from "./calendar.mjs";
import { fetchBlockingAssessment, isLastSaturdayOfMonth } from "./assessments.mjs";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function fetchPlanRow(planId, childId, query) {
  const { rows } = await query(
    `
    SELECT id, child_id, plan_date, status, phase, new_word_count, review_word_count,
           created_at, completed_at
    FROM daily_plans
    WHERE id = $1 AND child_id = $2
    `,
    [planId, childId]
  );
  return rows[0] || null;
}

export async function fetchPlanWords(planId, query) {
  const { rows } = await query(
    `
    SELECT w.id, w.lemma, w.explanation, w.picture_emoji, w.picture_search,
           w.picture_style, dpw.slot, dpw.word_role
    FROM daily_plan_words dpw
    JOIN words w ON w.id = dpw.word_id
    WHERE dpw.daily_plan_id = $1
    ORDER BY dpw.slot
    `,
    [planId]
  );
  return rows;
}

export function mapPlanWord(row) {
  return {
    ...mapWordRow(row),
    slot: row.slot,
    wordRole: row.word_role,
  };
}

export async function fetchPlanDetail(planId, childId, query) {
  const plan = await fetchPlanRow(planId, childId, query);
  if (!plan) return null;
  const wordRows = await fetchPlanWords(planId, query);
  const words = wordRows.map(mapPlanWord);
  const newWords = words.filter((w) => w.wordRole === "new");
  const reviewWords = words.filter((w) => w.wordRole === "review");
  return {
    id: plan.id,
    planDate: plan.plan_date,
    status: plan.status,
    phase: plan.phase,
    newWordCount: plan.new_word_count,
    reviewWordCount: plan.review_word_count,
    createdAt: plan.created_at,
    completedAt: plan.completed_at,
    words,
    newWords,
    reviewWords,
  };
}

async function pickNewWords(childId, limit, query) {
  const { rows } = await query(
    `
    SELECT cws.word_id, cws.source
    FROM child_word_state cws
    JOIN words w ON w.id = cws.word_id AND w.active = TRUE
    WHERE cws.child_id = $1 AND cws.status = 'available'
    `,
    [childId]
  );
  const retry = shuffle(rows.filter((r) => r.source === "retry" || r.source === "missed_day"));
  const fresh = shuffle(rows.filter((r) => r.source === "new"));
  const ordered = retry.concat(fresh);
  if (ordered.length < limit) {
    const err = new Error("Not enough words left in the pool");
    err.status = 422;
    throw err;
  }
  return ordered.slice(0, limit).map((r) => r.word_id);
}

async function pickReviewWords(childId, excludeIds, limit, query) {
  if (limit <= 0) return [];
  if (!excludeIds.length) {
    const res = await query(
      `
      SELECT cws.word_id
      FROM child_word_state cws
      JOIN words w ON w.id = cws.word_id AND w.active = TRUE
      WHERE cws.child_id = $1 AND cws.status = 'mastered'
      ORDER BY cws.last_assigned_date ASC NULLS FIRST, random()
      LIMIT $2
      `,
      [childId, limit]
    );
    return res.rows.map((r) => r.word_id);
  }
  const res = await query(
    `
    SELECT cws.word_id
    FROM child_word_state cws
    JOIN words w ON w.id = cws.word_id AND w.active = TRUE
    WHERE cws.child_id = $1
      AND cws.status = 'mastered'
      AND cws.word_id <> ALL($2::int[])
    ORDER BY cws.last_assigned_date ASC NULLS FIRST, random()
    LIMIT $3
    `,
    [childId, excludeIds, limit]
  );
  return res.rows.map((r) => r.word_id);
}

export async function startDailyPlan(childId, query) {
  const hk = getHkNow();
  if (hk.isSaturday || hk.isSunday) {
    const err = new Error("No daily words on Saturday or Sunday");
    err.status = 422;
    throw err;
  }
  if (!(await isWorkday(hk.date, query))) {
    const err = new Error("Today is not a workday");
    err.status = 422;
    throw err;
  }
  if (await fetchBlockingAssessment(childId, query)) {
    const err = new Error("Complete the quiz or test first");
    err.status = 409;
    throw err;
  }

  const existing = await query(
    `SELECT id FROM daily_plans WHERE child_id = $1 AND plan_date = $2::date`,
    [childId, hk.date]
  );
  if (existing.rows.length) {
    const err = new Error("Daily plan already exists for today");
    err.status = 409;
    throw err;
  }

  const newIds = await pickNewWords(childId, 5, query);
  const reviewIds = await pickReviewWords(childId, newIds, 3, query);

  const { rows: planRows } = await query(
    `
    INSERT INTO daily_plans (child_id, plan_date, status, phase, new_word_count, review_word_count)
    VALUES ($1, $2::date, 'in_progress', 'learn', $3, $4)
    RETURNING id
    `,
    [childId, hk.date, 5, reviewIds.length]
  );
  const planId = planRows[0].id;

  let slot = 1;
  for (const wordId of newIds) {
    await query(
      `
      INSERT INTO daily_plan_words (daily_plan_id, word_id, word_role, slot)
      VALUES ($1, $2, 'new', $3)
      `,
      [planId, wordId, slot++]
    );
    await query(
      `
      UPDATE child_word_state
      SET status = 'assigned', last_assigned_date = $3::date, updated_at = now()
      WHERE child_id = $1 AND word_id = $2
      `,
      [childId, wordId, hk.date]
    );
  }
  for (const wordId of reviewIds) {
    await query(
      `
      INSERT INTO daily_plan_words (daily_plan_id, word_id, word_role, slot)
      VALUES ($1, $2, 'review', $3)
      `,
      [planId, wordId, slot++]
    );
    await query(
      `
      UPDATE child_word_state
      SET last_assigned_date = $3::date, updated_at = now()
      WHERE child_id = $1 AND word_id = $2
      `,
      [childId, wordId, hk.date]
    );
  }

  return fetchPlanDetail(planId, childId, query);
}

const PHASE_ORDER = ["learn", "l1", "l2", "l3", "done"];

export async function advancePhase(planId, childId, completedPhase, query) {
  const plan = await fetchPlanRow(planId, childId, query);
  if (!plan) {
    const err = new Error("Plan not found");
    err.status = 404;
    throw err;
  }
  if (plan.status !== "in_progress") {
    const err = new Error("Plan is not in progress");
    err.status = 422;
    throw err;
  }
  if (plan.phase !== completedPhase) {
    const err = new Error(`Expected phase ${plan.phase}, got ${completedPhase}`);
    err.status = 422;
    throw err;
  }

  const idx = PHASE_ORDER.indexOf(completedPhase);
  const nextPhase = PHASE_ORDER[idx + 1];
  if (!nextPhase) {
    const err = new Error("Invalid phase");
    err.status = 422;
    throw err;
  }

  const hk = getHkNow();
  if (nextPhase === "done") {
    await query(
      `
      UPDATE daily_plans
      SET phase = 'done', status = 'completed', completed_at = now()
      WHERE id = $1
      `,
      [planId]
    );
    await query(
      `
      UPDATE child_word_state cws
      SET status = 'available', updated_at = now()
      FROM daily_plan_words dpw
      WHERE dpw.daily_plan_id = $1
        AND dpw.word_role = 'new'
        AND cws.child_id = $2
        AND cws.word_id = dpw.word_id
      `,
      [planId, childId]
    );
  } else {
    await query(`UPDATE daily_plans SET phase = $2 WHERE id = $1`, [planId, nextPhase]);
  }

  return fetchPlanDetail(planId, childId, query);
}

export async function fetchLearnWords(planId, childId, query) {
  const plan = await fetchPlanDetail(planId, childId, query);
  if (!plan) return null;
  const ids = plan.words.map((w) => w.id);
  const { rows: examples } = await query(
    `
    SELECT word_id, text, sort_order
    FROM word_examples
    WHERE word_id = ANY($1::int[])
    ORDER BY word_id, sort_order
    `,
    [ids]
  );
  const byWord = {};
  examples.forEach((ex) => {
    if (!byWord[ex.word_id]) byWord[ex.word_id] = [];
    byWord[ex.word_id].push(ex.text);
  });
  return {
    plan,
    words: plan.words.map((w) => ({
      ...w,
      examples: byWord[w.id] || [],
    })),
  };
}

export async function fetchPracticeWords(planId, childId, phase, query) {
  const plan = await fetchPlanDetail(planId, childId, query);
  if (!plan) return null;

  let words = plan.words;
  if (phase === "l3") {
    words = plan.newWords;
  }

  const ids = words.map((w) => w.id);
  if (!ids.length) {
    return { plan, words: [], blanks: [] };
  }

  const { rows: blanks } = await query(
    `
    SELECT bi.id, bi.word_id, bi.text, bi.answer, bi.distractors
    FROM blank_items bi
    WHERE bi.word_id = ANY($1::int[]) AND bi.active = TRUE
    `,
    [ids]
  );

  const blankByWord = {};
  blanks.forEach((b) => {
    if (!blankByWord[b.word_id]) blankByWord[b.word_id] = [];
    blankByWord[b.word_id].push({
      id: b.id,
      text: b.text,
      answer: b.answer,
      distractors: b.distractors,
    });
  });

  return {
    plan,
    phase,
    words: words.map((w) => ({
      ...w,
      blanks: blankByWord[w.id] || [],
    })),
  };
}

export async function buildTodayPayload(childId, query) {
  const hk = getHkNow();
  const workday = await isWorkday(hk.date, query);
  const blockingAssessment = await fetchBlockingAssessment(childId, query);

  const { rows: planRows } = await query(
    `SELECT id FROM daily_plans WHERE child_id = $1 AND plan_date = $2::date`,
    [childId, hk.date]
  );
  const dailyPlan = planRows.length
    ? await fetchPlanDetail(planRows[0].id, childId, query)
    : null;

  const canStartDaily =
    workday && !blockingAssessment && !dailyPlan && !hk.isSaturday && !hk.isSunday;

  const newWords = dailyPlan ? dailyPlan.newWords : [];
  const reviewWords = dailyPlan ? dailyPlan.reviewWords : [];
  const wordCount = dailyPlan
    ? dailyPlan.words.length
    : canStartDaily
      ? 5
      : 0;

  return {
    date: hk.date,
    isWorkday: workday,
    isSaturday: hk.isSaturday,
    isSunday: hk.isSunday,
    isLastSaturday: isLastSaturdayOfMonth(hk.date),
    blockingAssessment,
    dailyPlan,
    newWords,
    reviewWords,
    wordCount,
    canStartDaily,
  };
}
