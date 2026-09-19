import type { HitInput, WebSdkEventEntry, WebSdkHit } from "../types.js";
import { parseWebSdkUrl } from "./url.js";
import { extractAnalyticsBlock } from "./analytics-block.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parses a Web SDK (Alloy) interact/collect hit. Never throws: malformed
 * JSON bodies or unexpected shapes fall back to empty events with the raw
 * payload preserved.
 */
export function parseWebSdkHit(input: HitInput): WebSdkHit {
  const urlInfo = parseWebSdkUrl(input.url);

  const body = safeParseJson(input.body);

  const events = extractEvents(body);
  const orgId = extractOrgId(body);

  const result: WebSdkHit = {
    kind: "websdk",
    endpoint: urlInfo.endpoint,
    events,
    raw: body ?? null,
    unknown: urlInfo.unknown
  };

  if (urlInfo.datastreamId !== undefined) {
    result.datastreamId = urlInfo.datastreamId;
  }
  if (orgId !== undefined) {
    result.orgId = orgId;
  }
  if (body && isPlainObject(body) && isPlainObject(body["query"])) {
    result.query = body["query"];
  }
  if (body && isPlainObject(body) && isPlainObject(body["meta"])) {
    result.meta = body["meta"];
  }

  return result;
}

function safeParseJson(raw: string | undefined): unknown {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function extractEvents(body: unknown): WebSdkEventEntry[] {
  if (!isPlainObject(body) || !Array.isArray(body["events"])) {
    return [];
  }

  const events: WebSdkEventEntry[] = [];
  for (const raw of body["events"]) {
    if (!isPlainObject(raw)) continue;

    const xdm = isPlainObject(raw["xdm"]) ? raw["xdm"] : {};
    const data = isPlainObject(raw["data"]) ? raw["data"] : undefined;
    const analytics = extractAnalyticsBlock(data, xdm);

    const entry: WebSdkEventEntry = { xdm };
    if (data !== undefined) entry.data = data;
    if (analytics !== undefined) entry.analytics = analytics;

    events.push(entry);
  }

  return events;
}

function extractOrgId(body: unknown): string | undefined {
  if (isPlainObject(body) && typeof body["orgId"] === "string") {
    return body["orgId"];
  }
  return undefined;
}
