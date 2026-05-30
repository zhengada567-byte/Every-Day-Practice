import { json, corsHeaders } from "../http.mjs";

const LT_URL = "https://api.languagetool.org/v2/check";
const MAX_TEXT = 5000;

export async function checkGrammar(event, body) {
  const text = String(body.text || "").trim();
  if (!text) {
    const err = new Error("text is required");
    err.status = 400;
    throw err;
  }
  if (text.length > MAX_TEXT) {
    const err = new Error("text is too long");
    err.status = 400;
    throw err;
  }

  const res = await fetch(LT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "language=en-US&enabledOnly=false&textDataFilter=all&text=" + encodeURIComponent(text),
  });

  if (!res.ok) {
    const err = new Error("Grammar service unavailable");
    err.status = 502;
    throw err;
  }

  const data = await res.json();
  return json(200, data, corsHeaders(event));
}
