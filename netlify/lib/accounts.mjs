export const EMAIL_DOMAIN = "everydaypractice.com";
export const DEFAULT_PARENT_PASSWORD = "qwer1234";

/** Letters and numbers only, lowercase (for email local parts). */
export function slugifyPart(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parentEmailFromAccountName(accountName) {
  const slug = slugifyPart(accountName);
  if (!slug || slug.length < 2) {
    const err = new Error("Parent account name must be at least 2 letters or numbers");
    err.status = 400;
    throw err;
  }
  return slug + "@" + EMAIL_DOMAIN;
}

export function parentSlugFromEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  const at = e.indexOf("@");
  if (at <= 0) return "";
  return e.slice(0, at);
}

export function resolveParentEmail(parentAccount) {
  const raw = String(parentAccount || "").trim().toLowerCase();
  if (!raw) {
    const err = new Error("Parent account is required");
    err.status = 400;
    throw err;
  }
  if (raw.includes("@")) {
    return raw;
  }
  return parentEmailFromAccountName(raw);
}

export function childEmailForParent(parentEmail, childDisplayName) {
  const parentSlug = parentSlugFromEmail(parentEmail);
  const childSlug = slugifyPart(childDisplayName);
  if (!parentSlug) {
    const err = new Error("Invalid parent account");
    err.status = 400;
    throw err;
  }
  if (!childSlug || childSlug.length < 1) {
    const err = new Error("Child name is required");
    err.status = 400;
    throw err;
  }
  return childSlug + "_" + parentSlug + "@" + EMAIL_DOMAIN;
}

export function publicChildForParent(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}
