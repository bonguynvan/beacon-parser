import type { HitInput, HitType } from "./types.js";

const APPMEASUREMENT_PATH_RE = /\/b\/ss\/[^/]+\/[^/]+\/[^/?#]+/;
const WEBSDK_PATH_RE = /\/ee\/[^/]*\/(interact|collect)(?:[/?#]|$)/;

/**
 * Detects the hit generation from the URL shape alone. Does not parse the
 * body, so it is safe to call before any other work and never throws.
 */
export function detectHitType(input: HitInput): HitType {
  const url = safeParseUrl(input?.url);
  if (!url) return "unknown";

  const path = url.pathname;

  if (APPMEASUREMENT_PATH_RE.test(path)) {
    return "appmeasurement";
  }

  if (WEBSDK_PATH_RE.test(path)) {
    return "websdk";
  }

  return "unknown";
}

/**
 * Parses a URL defensively. Relative or malformed URLs are retried against
 * a dummy base so path-based detection still works without throwing.
 */
export function safeParseUrl(rawUrl: unknown): URL | null {
  if (typeof rawUrl !== "string" || rawUrl.length === 0) {
    return null;
  }

  try {
    return new URL(rawUrl);
  } catch {
    // Fall through to relative-URL handling below.
  }

  try {
    return new URL(rawUrl, "https://example.invalid");
  } catch {
    return null;
  }
}
