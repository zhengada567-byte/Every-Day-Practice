const DEFAULT_BASE = "https://api.moonshot.ai/v1";
const DEFAULT_MODEL = "moonshot-v1-8k";
const MAX_TEXT = 2000;

function kimiConfig() {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "Kimi is not configured. Set MOONSHOT_API_KEY in Netlify environment variables or env.txt for local dev."
    );
    err.status = 503;
    throw err;
  }
  return {
    apiKey,
    baseUrl: (process.env.MOONSHOT_API_BASE_URL || DEFAULT_BASE).replace(/\/$/, ""),
    model: process.env.MOONSHOT_MODEL || DEFAULT_MODEL,
  };
}

function parseJsonFromContent(content) {
  const raw = String(content || "").trim();
  if (!raw) {
    throw new Error("Empty response from Kimi");
  }
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Kimi did not return valid JSON");
  }
}

function normalizeIssues(rawIssues) {
  if (!Array.isArray(rawIssues)) return [];
  return rawIssues
    .map(function (item, index) {
      if (typeof item === "string") {
        return { type: "grammar", message: item, topic: "ai:" + index };
      }
      const type = String(item.type || "grammar").toLowerCase();
      const message = String(item.message || "").trim();
      if (!message) return null;
      const allowed = ["grammar", "spelling", "word", "length", "typo", "tense"];
      return {
        type: allowed.indexOf(type) >= 0 ? type : "grammar",
        message: message,
        topic: "ai:" + type + ":" + index,
      };
    })
    .filter(Boolean);
}

function buildPrompt(text, targetWord, minWords) {
  return (
    "Grade this English sentence for a child (ages 8–12).\n\n" +
    "Requirements:\n" +
    "- At least " +
    minWords +
    " words (count by spaces).\n" +
    '- Must use the vocabulary word "' +
    targetWord +
    '" (same word or clear inflection/plural is OK).\n' +
    "- Check: capitalization, ending punctuation (. ! ?), grammar, spelling, natural English.\n" +
    "- Be fair: accept creative but correct sentences.\n" +
    "- Reject only clear mistakes.\n" +
    "- Give short, kid-friendly feedback (one sentence per issue).\n\n" +
    'Return ONLY JSON, no markdown:\n' +
    '{"ok":true|false,"issues":[{"type":"grammar|spelling|word|length","message":"..."}]}\n\n' +
    "Sentence:\n" +
    text
  );
}

export async function gradeSentenceWithKimi({ text, targetWord, minWords = 10 }) {
  if (!text || !String(text).trim()) {
    const err = new Error("text is required");
    err.status = 400;
    throw err;
  }
  if (text.length > MAX_TEXT) {
    const err = new Error("text is too long");
    err.status = 400;
    throw err;
  }
  if (!targetWord || !String(targetWord).trim()) {
    const err = new Error("targetWord is required");
    err.status = 400;
    throw err;
  }

  const { apiKey, baseUrl, model } = kimiConfig();
  const res = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful English teacher for children. You grade sentences strictly but kindly. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: buildPrompt(text.trim(), String(targetWord).trim(), minWords),
        },
      ],
      temperature: 0.2,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(function () {
      return "";
    });
    console.error("Kimi API error", res.status, detail.slice(0, 500));
    const err = new Error("Kimi sentence check failed (" + res.status + ")");
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : "";
  const parsed = parseJsonFromContent(content);
  const issues = normalizeIssues(parsed.issues);
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return {
    ok: !!parsed.ok && issues.length === 0,
    issues: issues,
    wordCount: wordCount,
    ai: true,
    provider: "kimi",
  };
}
