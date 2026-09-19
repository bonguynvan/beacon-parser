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

  if (typeof analytics["pageName"] === "string") {
    block.pageName = analytics["pageName"];
  }

  if (Array.isArray(analytics["events"])) {
    block.events = analytics["events"].filter((e): e is string => typeof e === "string");
  }

  if (isPlainObject(analytics["contextData"])) {
    block.contextData = analytics["contextData"];
  }

  return block;
}
