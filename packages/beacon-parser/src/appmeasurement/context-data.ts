import type { ContextData } from "../types.js";

/**
 * Extracts and nests context data params. AppMeasurement serializes context
 * data as flat "c.a=1", "c.b.c=2" query keys, with the AppMeasurement plugin
 * closing nested groups with a bare ".c" segment (e.g. "c.b.c=2&c.b..c" is
 * never emitted by the wire format we parse; we only need to un-flatten the
 * dotted keys into a nested object).
 *
 * Returns the nested object plus the list of raw param keys that were
 * consumed, so the caller can exclude them from "unknown".
 */
export function extractContextData(params: Record<string, string>): {
  contextData: ContextData;
  consumedKeys: string[];
} {
  const contextData: ContextData = {};
  const consumedKeys: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (key !== "c" && !key.startsWith("c.")) continue;
    if (key === "c") continue; // "c" alone is the channel param, not context data.

    const path = key
      .slice(2)
      .split(".")
      .filter((segment) => segment.length > 0);

    if (path.length === 0) continue;

    setNested(contextData, path, value);
    consumedKeys.push(key);
  }

  return { contextData, consumedKeys };
}

function setNested(target: ContextData, path: string[], value: string): void {
  let cursor: Record<string, unknown> = target;

  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i] as string;
    const next = cursor[segment];
    if (typeof next === "object" && next !== null && !Array.isArray(next)) {
      cursor = next as Record<string, unknown>;
    } else {
      const created: Record<string, unknown> = {};
      cursor[segment] = created;
      cursor = created;
    }
  }

  const lastSegment = path[path.length - 1] as string;
  cursor[lastSegment] = value;
}
