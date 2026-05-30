const HK = "Asia/Hong_Kong";
const WEEKDAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export function getHkNow(base = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: HK,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
      .formatToParts(base)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    isSaturday: parts.weekday === "Sat",
    isSunday: parts.weekday === "Sun",
    isWeekday: WEEKDAYS.has(parts.weekday),
  };
}

export async function isHoliday(date, query) {
  const { rows } = await query(
    "SELECT 1 FROM holidays WHERE date = $1::date AND region = 'HK'",
    [date]
  );
  return rows.length > 0;
}

export async function isWorkday(date, query) {
  const base = new Date(`${date}T12:00:00+08:00`);
  const hk = getHkNow(base);
  if (!WEEKDAYS.has(hk.weekday)) {
    return false;
  }
  return !(await isHoliday(date, query));
}

export function mapWordRow(row) {
  return {
    id: row.id,
    lemma: row.lemma,
    explanation: row.explanation,
    pictureEmoji: row.picture_emoji,
    pictureSearch: row.picture_search,
    pictureStyle: row.picture_style,
  };
}
