import type { WebSdkAnalyticsBlock } from "../types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extracts the `__adobe.analytics` block Alloy attaches to event `data` (and,
 * less commonly, directly under `xdm`). Returns undefined when absent or
 * malformed rather than throwing.
 */
export function extractAnalyticsBlock(
  data: unknown,
  xdm: unknown
): WebSdkAnalyticsBlock | undefined {
  const fromData = readAnalyticsBlock(data);
  if (fromData) return fromData;

  return readAnalyticsBlock(xdm);
}

function readAnalyticsBlock(source: unknown): WebSdkAnalyticsBlock | undefined {
  if (!isPlainObject(source)) return undefined;

  const adobe = source["__adobe"];
  if (!isPlainObject(adobe)) return undefined;

  const analytics = adobe["analytics"];
  if (!isPlainObject(analytics)) return undefined;

  const block: WebSdkAnalyticsBlock = { ...analytics };

  // The typed fields are authoritative: a raw key that shares a typed field's
  // name but doesn't normalize (e.g. linkType: "lnk_o", eVars: "x") is removed
  // from this block so its declared type holds. The original stays untouched
  // in event.data and hit.raw.
  setOrRemove(block, "pageName", typeof analytics["pageName"] === "string" ? analytics["pageName"] : undefined);
  setOrRemove(block, "pageURL", stringAt(analytics, ["pageURL", "g"]));
  setOrRemove(block, "events", normalizeEvents(analytics["events"]));
  setOrRemove(block, "contextData", isPlainObject(analytics["contextData"]) ? analytics["contextData"] : undefined);
  setOrRemove(block, "eVars", numberedValues(analytics, ["v", "eVar"], 250));
  setOrRemove(block, "props", numberedValues(analytics, ["c", "prop"], 75));
  setOrRemove(block, "linkName", stringAt(analytics, ["linkName", "pev2"]));
  setOrRemove(block, "linkURL", stringAt(analytics, ["linkURL", "pev1"]));

  const linkType = stringAt(analytics, ["linkType", "pe"]);
  setOrRemove(block, "linkType", linkType === "o" || linkType === "d" || linkType === "e" ? linkType : undefined);

  return block;
}

type TypedKey = "pageName" | "pageURL" | "events" | "contextData" | "eVars" | "props" | "linkName" | "linkURL" | "linkType";

function setOrRemove<K extends TypedKey>(
  block: WebSdkAnalyticsBlock,
  key: K,
  value: WebSdkAnalyticsBlock[K] | undefined
): void {
  if (value === undefined) {
    delete block[key];
  } else {
    block[key] = value;
  }
}

/**
 * Adobe documents `events` as formatted like the AppMeasurement events
 * variable ("event1,event2=5"); an array of tokens is also accepted (what
 * this project's earlier fixtures used). TODO: verify against Adobe whether
 * the array form is officially supported or only tolerated -- both are read.
 */
function normalizeEvents(value: unknown): string[] | undefined {
  if (typeof value === "string") return splitTokens(value);
  if (Array.isArray(value)) {
    return value.filter((e): e is string => typeof e === "string").flatMap(splitTokens);
  }
  return undefined;
}

function splitTokens(raw: string): string[] {
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function scalarToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

/** First key in `keys` (in order) whose value is a string or finite number; the long form is listed first so it wins over a shorthand. */
function stringAt(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = scalarToString(source[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Collects `<prefix>N` keys (e.g. eVar12 / v12) into a map keyed by "N".
 * `prefixes` is ordered shorthand-first, so a long-form key overwrites a
 * shorthand for the same N (Adobe doesn't document precedence when both are
 * sent -- TODO: verify). Indexes outside 1..max are left in the untouched
 * block rather than guessed at.
 */
function numberedValues(
  source: Record<string, unknown>,
  prefixes: string[],
  max: number
): Record<string, string> | undefined {
  const result: Record<string, string> = {};

  for (const prefix of prefixes) {
    const pattern = new RegExp(`^${prefix}(\\d+)$`);
    for (const [key, raw] of Object.entries(source)) {
      const match = pattern.exec(key);
      const index = match?.[1];
      if (index === undefined) continue;

      const n = Number(index);
      if (n < 1 || n > max) continue;

      const value = scalarToString(raw);
      if (value !== undefined) result[String(n)] = value;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
