const DEFAULT_ORIGIN = "http://localhost:8888";

export function corsOrigin() {
  return process.env.CORS_ORIGIN || DEFAULT_ORIGIN;
}

export function corsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin || "";
  const allowed = corsOrigin();
  const useOrigin =
    allowed === "*" || origin === allowed ? origin || allowed : allowed;
  return {
    "Access-Control-Allow-Origin": useOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(status, body, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

export function noContent(extraHeaders = {}) {
  return {
    statusCode: 204,
    headers: extraHeaders,
    body: "",
  };
}

export function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }
}

export function isSecure(event) {
  const proto = event.headers["x-forwarded-proto"] || "http";
  return proto === "https";
}

export function errorResponse(event, err) {
  const status = err.status || 500;
  const payload = {
    error: err.message || "Internal Server Error",
  };
  if (err.details) {
    payload.details = err.details;
  }
  if (status >= 500) {
    console.error(err);
  }
  return json(status, payload, corsHeaders(event));
}

export function ok(event, body, status = 200, extraHeaders = {}) {
  return json(status, body, { ...corsHeaders(event), ...extraHeaders });
}

export function routePath(event) {
  const raw = event.path || "";
  const apiMatch = raw.match(/\/api\/v1(\/[^?]*)/);
  if (apiMatch) return apiMatch[1];
  const fnMatch = raw.match(/\/functions\/api(\/[^?]*)/);
  if (fnMatch) return fnMatch[1];
  return raw;
}
