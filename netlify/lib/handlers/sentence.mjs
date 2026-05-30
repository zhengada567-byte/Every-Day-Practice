import { gradeSentenceWithKimi } from "../kimi-sentence.mjs";
import { ok } from "../http.mjs";

export async function validateSentence(event, body) {
  const text = String(body.text || "").trim();
  const targetWord = String(body.targetWord || body.target || "").trim();
  const minWords = parseInt(body.minWords, 10) || 10;

  const result = await gradeSentenceWithKimi({ text, targetWord, minWords });
  return ok(event, result);
}
