import { getHkNow, isWorkday } from "./calendar.mjs";
import { gradeBlankChoice, prepareBlankItem } from "./blank-grammar.mjs";

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ISO week key e.g. 2026-W22 from YYYY-MM-DD */
export function isoWeekKey(dateStr) {
  const d = new Date(dateStr + "T12:00:00+08:00");
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThu = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7
    );
  return target.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
}

export function mondayOfWeek(dateStr) {
  const d = new Date(dateStr + "T12:00:00+08:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return formatDate(d);
}

export function fridayOfWeek(dateStr) {
  const mon = new Date(mondayOfWeek(dateStr) + "T12:00:00+08:00");
  mon.setDate(mon.getDate() + 4);
  return formatDate(mon);
}

export function saturdayOfWeek(dateStr) {
  const mon = new Date(mondayOfWeek(dateStr) + "T12:00:00+08:00");
  mon.setDate(mon.getDate() + 5);
  return formatDate(mon);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function compareDate(a, b) {
  return a === b ? 0 : a < b ? -1 : 1;
}

export async function getWeekCompletedNewWordIds(childId, monday, friday, query) {
  const filtered = [];
  for (let d = monday; compareDate(d, friday) <= 0; ) {
    if (await isWorkday(d, query)) {
      const { rows: dayRows } = await query(
        `
        SELECT DISTINCT dpw.word_id
        FROM daily_plan_words dpw
        JOIN daily_plans dp ON dp.id = dpw.daily_plan_id
        WHERE dp.child_id = $1 AND dp.status = 'completed'
          AND dpw.word_role = 'new' AND dp.plan_date = $2::date
        `,
        [childId, d]
      );
      dayRows.forEach((r) => {
        if (!filtered.includes(r.word_id)) filtered.push(r.word_id);
      });
    }
    const next = new Date(d + "T12:00:00+08:00");
    next.setDate(next.getDate() + 1);
    d = formatDate(next);
  }
  return filtered;
}

export async function expireOldWeekly(childId, currentPeriodKey, query) {
  await query(
    `
    UPDATE assessments
    SET status = 'expired'
    WHERE child_id = $1
      AND type = 'weekly'
      AND period_key <> $2
      AND status IN ('scheduled', 'in_progress', 'pending_makeup')
    `,
    [childId, currentPeriodKey]
  );
}

export async function refreshAssessmentStatus(assessment, hkDate, query) {
  if (!assessment || assessment.status === "completed" || assessment.status === "expired") {
    return assessment;
  }
  if (
    assessment.status === "scheduled" &&
    compareDate(hkDate, assessment.scheduled_date) > 0
  ) {
    await query(
      `UPDATE assessments SET status = 'pending_makeup' WHERE id = $1`,
      [assessment.id]
    );
    assessment.status = "pending_makeup";
  }
  return assessment;
}

async function buildItemsForWord(wordId, query, opts = {}) {
  const pending = [];
  const l2Only = opts.l2Only === true || opts.assessmentType === "monthly";
  const { rows: wrows } = await query(
    `SELECT id, lemma, explanation, picture_emoji FROM words WHERE id = $1`,
    [wordId]
  );
  if (!wrows.length) return pending;
  const w = wrows[0];

  if (!l2Only) {
  const usePicture = Math.random() < 0.35;
  if (!usePicture) {
    const { rows: others } = await query(
      `SELECT explanation FROM words WHERE id <> $1 AND active = TRUE ORDER BY random() LIMIT 3`,
      [wordId]
    );
    const choices = shuffle([w.explanation, ...others.map((o) => o.explanation)]);
    pending.push({
      wordId,
      itemType: "match_meaning",
      payload: { lemma: w.lemma, choices, prompt: "Pick the correct meaning" },
      answerKey: { correct: w.explanation },
    });
  } else {
    const distractorEmojis = await query(
      `SELECT picture_emoji FROM words WHERE id <> $1 AND active = TRUE ORDER BY random() LIMIT 3`,
      [wordId]
    );
    const choices = shuffle([
      w.picture_emoji,
      ...distractorEmojis.rows.map((r) => r.picture_emoji),
    ]);
    pending.push({
      wordId,
      itemType: "match_picture",
      payload: { lemma: w.lemma, choices, prompt: "Pick the correct picture" },
      answerKey: { correct: w.picture_emoji },
    });
  }
  }

  const { rows: blanks } = await query(
    `SELECT id, text, answer, distractors FROM blank_items
     WHERE word_id = $1 AND active = TRUE ORDER BY random() LIMIT 1`,
    [wordId]
  );
  if (blanks.length) {
    const b = blanks[0];
    const prep = prepareBlankItem({
      text: b.text,
      answer: b.answer,
      distractors: b.distractors || [],
    });
    pending.push({
      wordId,
      itemType: "blank",
      payload: {
        lemma: w.lemma,
        text: prep.text,
        choices: shuffle(prep.choices.slice(0, 4)),
        blankHint:
          prep.form === "plural"
            ? "Use a plural noun (e.g. after five, many, or a swarm of)."
            : prep.form === "verb"
              ? "Use the correct verb form."
              : "",
      },
      answerKey: {
        correct: prep.answer,
        baseAnswer: prep.baseAnswer,
        acceptAnswers: prep.acceptAnswers,
        blankForm: prep.form,
        blankItemId: b.id,
      },
    });
  }

  return pending;
}

/** Weekly: L1 + L2 per word (shuffled). Monthly: L2 (blank) only. */
export async function generateItems(assessmentId, wordIds, query, opts = {}) {
  const all = [];
  for (const wordId of wordIds) {
    const items = await buildItemsForWord(wordId, query, opts);
    items.forEach(function (item) {
      all.push(item);
    });
  }

  const ordered = shuffle(all);
  for (let i = 0; i < ordered.length; i++) {
    const item = ordered[i];
    await query(
      `
      INSERT INTO assessment_items (assessment_id, word_id, item_type, sort_order, payload, answer_key)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        assessmentId,
        item.wordId,
        item.itemType,
        i,
        JSON.stringify(item.payload),
        JSON.stringify(item.answerKey),
      ]
    );
  }
}

export function monthPeriodKey(dateStr) {
  return dateStr.slice(0, 7);
}

/** Last Saturday of the calendar month containing dateStr (HK noon anchor). */
export function lastSaturdayOfMonth(dateStr) {
  const d = new Date(dateStr + "T12:00:00+08:00");
  const y = d.getFullYear();
  const m = d.getMonth();
  const lastDay = new Date(y, m + 1, 0);
  while (lastDay.getDay() !== 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  const yy = lastDay.getFullYear();
  const mm = String(lastDay.getMonth() + 1).padStart(2, "0");
  const dd = String(lastDay.getDate()).padStart(2, "0");
  return yy + "-" + mm + "-" + dd;
}

export function isLastSaturdayOfMonth(dateStr) {
  const hk = getHkNow(new Date(dateStr + "T12:00:00+08:00"));
  if (!hk.isSaturday) return false;
  return lastSaturdayOfMonth(dateStr) === dateStr;
}

export async function getMonthCompletedNewWordIds(childId, periodKey, query) {
  const [y, m] = periodKey.split("-").map(Number);
  const lastDayNum = new Date(y, m, 0).getDate();
  const filtered = [];

  for (let day = 1; day <= lastDayNum; day++) {
    const d =
      y +
      "-" +
      String(m).padStart(2, "0") +
      "-" +
      String(day).padStart(2, "0");
    if (!(await isWorkday(d, query))) continue;
    const { rows: dayRows } = await query(
      `
      SELECT DISTINCT dpw.word_id
      FROM daily_plan_words dpw
      JOIN daily_plans dp ON dp.id = dpw.daily_plan_id
      WHERE dp.child_id = $1 AND dp.status = 'completed'
        AND dpw.word_role = 'new' AND dp.plan_date = $2::date
      `,
      [childId, d]
    );
    dayRows.forEach((r) => {
      if (!filtered.includes(r.word_id)) filtered.push(r.word_id);
    });
  }
  return filtered;
}

export async function expireOldMonthly(childId, currentPeriodKey, query) {
  await query(
    `
    UPDATE assessments
    SET status = 'expired'
    WHERE child_id = $1
      AND type = 'monthly'
      AND period_key <> $2
      AND status IN ('scheduled', 'in_progress', 'pending_makeup')
    `,
    [childId, currentPeriodKey]
  );
}

export async function ensureMonthlyAssessment(childId, query) {
  const hk = getHkNow();
  const periodKey = monthPeriodKey(hk.date);
  const monthSat = lastSaturdayOfMonth(hk.date);

  await expireOldMonthly(childId, periodKey, query);

  const wordIds = await getMonthCompletedNewWordIds(childId, periodKey, query);

  const { rows: existingRows } = await query(
    `
    SELECT id, type, period_key, scheduled_date, status, word_count, started_at, completed_at
    FROM assessments
    WHERE child_id = $1 AND type = 'monthly' AND period_key = $2
    `,
    [childId, periodKey]
  );

  let assessment = existingRows[0] || null;
  const onOrAfterMonthlyDay = compareDate(hk.date, monthSat) >= 0;

  if (!assessment && wordIds.length && onOrAfterMonthlyDay) {
    const { rows: created } = await query(
      `
      INSERT INTO assessments (child_id, type, period_key, scheduled_date, status, word_count)
      VALUES ($1, 'monthly', $2, $3::date, 'scheduled', $4)
      RETURNING id, type, period_key, scheduled_date, status, word_count, started_at, completed_at
      `,
      [childId, periodKey, monthSat, wordIds.length]
    );
    assessment = created[0];
    await generateItems(assessment.id, wordIds, query, { assessmentType: "monthly" });
  }

  if (assessment) {
    assessment = await refreshAssessmentStatus(assessment, hk.date, query);
  }

  return { assessment, wordIds, monthSat, periodKey };
}

export async function ensureWeeklyAssessment(childId, query) {
  const hk = getHkNow();
  const periodKey = isoWeekKey(hk.date);
  const weekSat = saturdayOfWeek(hk.date);

  await expireOldWeekly(childId, periodKey, query);

  const monday = mondayOfWeek(hk.date);
  const friday = fridayOfWeek(hk.date);
  const wordIds = await getWeekCompletedNewWordIds(childId, monday, friday, query);

  const { rows: existingRows } = await query(
    `
    SELECT id, type, period_key, scheduled_date, status, word_count, started_at, completed_at
    FROM assessments
    WHERE child_id = $1 AND type = 'weekly' AND period_key = $2
    `,
    [childId, periodKey]
  );

  let assessment = existingRows[0] || null;

  const onOrAfterQuizDay = compareDate(hk.date, weekSat) >= 0;

  if (!assessment && wordIds.length && onOrAfterQuizDay) {
    const { rows: created } = await query(
      `
      INSERT INTO assessments (child_id, type, period_key, scheduled_date, status, word_count)
      VALUES ($1, 'weekly', $2, $3::date, 'scheduled', $4)
      RETURNING id, type, period_key, scheduled_date, status, word_count, started_at, completed_at
      `,
      [childId, periodKey, weekSat, wordIds.length]
    );
    assessment = created[0];
    await generateItems(assessment.id, wordIds, query, { assessmentType: "weekly" });
  }

  if (assessment) {
    assessment = await refreshAssessmentStatus(assessment, hk.date, query);
  }

  return { assessment, wordIds, weekSat, periodKey };
}

export async function fetchBlockingAssessment(childId, query) {
  await ensureWeeklyAssessment(childId, query);
  await ensureMonthlyAssessment(childId, query);

  const { rows } = await query(
    `
    SELECT id, type, period_key, status, scheduled_date, word_count
    FROM assessments
    WHERE child_id = $1
      AND type IN ('weekly', 'monthly')
      AND status IN ('scheduled', 'in_progress', 'pending_makeup')
    ORDER BY CASE type WHEN 'weekly' THEN 0 ELSE 1 END, scheduled_date ASC
    LIMIT 1
    `,
    [childId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: row.id,
    type: row.type,
    periodKey: row.period_key,
    status: row.status,
    scheduledDate: row.scheduled_date,
    wordCount: row.word_count,
  };
}

export function mapItemForClient(row) {
  const payload =
    typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload || {};
  return {
    id: row.id,
    wordId: row.word_id,
    itemType: row.item_type,
    sortOrder: row.sort_order,
    lemma: payload.lemma,
    payload: payload,
    answered: row.answered != null,
    wasCorrect: row.answered === true,
  };
}

function quizItemsOnly(items) {
  return items.filter((row) => row.item_type !== "sentence");
}

export async function getAssessmentDetail(assessmentId, childId, query) {
  const { rows } = await query(
    `
    SELECT id, type, period_key, scheduled_date, status, word_count, started_at, completed_at
    FROM assessments WHERE id = $1 AND child_id = $2
    `,
    [assessmentId, childId]
  );
  if (!rows.length) return null;
  const a = rows[0];

  const { rows: items } = await query(
    `
    SELECT ai.id, ai.word_id, ai.item_type, ai.sort_order, ai.payload,
           ar.correct AS answered, ar.response
    FROM assessment_items ai
    LEFT JOIN assessment_responses ar
      ON ar.assessment_item_id = ai.id AND ar.child_id = $2
    WHERE ai.assessment_id = $1
    ORDER BY ai.sort_order
    `,
    [assessmentId, childId]
  );

  const quizItems = quizItemsOnly(items);

  return {
    id: a.id,
    type: a.type,
    periodKey: a.period_key,
    scheduledDate: a.scheduled_date,
    status: a.status,
    wordCount: a.word_count,
    startedAt: a.started_at,
    completedAt: a.completed_at,
    items: quizItems.map(mapItemForClient),
    progress: {
      total: quizItems.length,
      answered: quizItems.filter((i) => i.answered != null).length,
    },
  };
}

export async function startAssessment(assessmentId, childId, query) {
  const { rows } = await query(
    `
    UPDATE assessments
    SET status = 'in_progress', started_at = COALESCE(started_at, now())
    WHERE id = $1 AND child_id = $2
      AND status IN ('scheduled', 'pending_makeup', 'in_progress')
    RETURNING id
    `,
    [assessmentId, childId]
  );
  if (!rows.length) {
    const err = new Error("Assessment not available");
    err.status = 422;
    throw err;
  }
  return getAssessmentDetail(assessmentId, childId, query);
}

function gradeItem(itemType, answerKey, response) {
  if (itemType === "match_meaning") {
    const sel = (response.answer || "").trim();
    return sel === (answerKey.correct || "");
  }
  if (itemType === "match_picture") {
    const sel = (response.answer || "").trim();
    return sel === (answerKey.correct || "");
  }
  if (itemType === "blank") {
    const sel = (response.answer || "").trim();
    const prepared = {
      acceptAnswers: answerKey.acceptAnswers || [
        (answerKey.correct || "").toLowerCase(),
      ],
      form: answerKey.blankForm || "singular",
      baseAnswer: (answerKey.baseAnswer || answerKey.correct || "").toLowerCase(),
    };
    return gradeBlankChoice(prepared, sel);
  }
  if (itemType === "sentence") {
    const text = (response.text || "").trim();
    const lemma = answerKey.lemma || "";
    const minWords = answerKey.minWords || 10;
    const wc = text.split(/\s+/).filter(Boolean).length;
    if (wc < minWords) return false;
    const re = new RegExp("\\b" + lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    return re.test(text);
  }
  return false;
}

export async function respondToItem(assessmentItemId, childId, response, query) {
  const { rows } = await query(
    `
    SELECT ai.id, ai.assessment_id, ai.word_id, ai.item_type, ai.answer_key,
           a.status, a.child_id
    FROM assessment_items ai
    JOIN assessments a ON a.id = ai.assessment_id
    WHERE ai.id = $1 AND a.child_id = $2
    `,
    [assessmentItemId, childId]
  );
  if (!rows.length) {
    const err = new Error("Item not found");
    err.status = 404;
    throw err;
  }
  const item = rows[0];
  if (!["scheduled", "in_progress", "pending_makeup"].includes(item.status)) {
    const err = new Error("Assessment is closed");
    err.status = 422;
    throw err;
  }

  const answerKey = item.answer_key || {};
  const correct = gradeItem(item.item_type, answerKey, response);

  await query(
    `
    INSERT INTO assessment_responses (assessment_item_id, child_id, response, correct)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (assessment_item_id, child_id)
    DO UPDATE SET response = EXCLUDED.response, correct = EXCLUDED.correct, submitted_at = now()
    `,
    [assessmentItemId, childId, JSON.stringify(response), correct]
  );

  if (item.status === "scheduled") {
    await query(
      `UPDATE assessments SET status = 'in_progress', started_at = COALESCE(started_at, now()) WHERE id = $1`,
      [item.assessment_id]
    );
  }

  return { correct, itemId: assessmentItemId };
}

export async function completeAssessment(assessmentId, childId, query) {
  const { rows: items } = await query(
    `
    SELECT ai.word_id, ai.id, ar.correct
    FROM assessment_items ai
    LEFT JOIN assessment_responses ar
      ON ar.assessment_item_id = ai.id AND ar.child_id = $2
    WHERE ai.assessment_id = $1
      AND ai.item_type <> 'sentence'
    `,
    [assessmentId, childId]
  );

  const unanswered = items.filter((i) => i.correct == null);
  if (unanswered.length) {
    const err = new Error("Answer all questions first");
    err.status = 422;
    err.details = { remaining: unanswered.length };
    throw err;
  }

  const byWord = {};
  items.forEach((i) => {
    if (!byWord[i.word_id]) byWord[i.word_id] = { total: 0, correct: 0 };
    byWord[i.word_id].total++;
    if (i.correct) byWord[i.word_id].correct++;
  });

  const mastered = [];
  const retry = [];

  for (const [wordId, stats] of Object.entries(byWord)) {
    const allCorrect = stats.correct === stats.total;
    await query(
      `
      INSERT INTO assessment_word_results (assessment_id, word_id, all_correct, items_total, items_correct)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (assessment_id, word_id) DO UPDATE SET
        all_correct = EXCLUDED.all_correct,
        items_total = EXCLUDED.items_total,
        items_correct = EXCLUDED.items_correct
      `,
      [assessmentId, wordId, allCorrect, stats.total, stats.correct]
    );

    const { rows: wrows } = await query(`SELECT lemma FROM words WHERE id = $1`, [wordId]);
    const lemma = wrows[0]?.lemma || wordId;

    if (allCorrect) {
      mastered.push(lemma);
      await query(
        `
        UPDATE child_word_state
        SET status = 'mastered', mastered_at = now(), source = 'new', updated_at = now()
        WHERE child_id = $1 AND word_id = $2
        `,
        [childId, wordId]
      );
    } else {
      retry.push(lemma);
      await query(
        `
        UPDATE child_word_state
        SET status = 'available', source = 'retry', mastered_at = NULL, updated_at = now()
        WHERE child_id = $1 AND word_id = $2
        `,
        [childId, wordId]
      );
    }
  }

  const { rows: assessRows } = await query(
    `SELECT type, period_key FROM assessments WHERE id = $1`,
    [assessmentId]
  );
  const assess = assessRows[0];

  const summary = {
    mastered,
    retry,
    masteredCount: mastered.length,
    retryCount: retry.length,
    wordCount: Object.keys(byWord).length,
  };

  await query(
    `
    UPDATE assessments SET status = 'completed', completed_at = now() WHERE id = $1
    `,
    [assessmentId]
  );

  await query(
    `
    INSERT INTO reports (child_id, assessment_id, report_type, period_key, summary)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [childId, assessmentId, assess.type, assess.period_key, JSON.stringify(summary)]
  );

  return { summary, assessmentId };
}

export async function getCurrentAssessment(childId, query) {
  await ensureWeeklyAssessment(childId, query);
  await ensureMonthlyAssessment(childId, query);
  const blocking = await fetchBlockingAssessment(childId, query);
  if (!blocking) return null;
  return getAssessmentDetail(blocking.id, childId, query);
}
