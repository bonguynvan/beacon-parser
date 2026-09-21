import { parseEventToken } from "./appmeasurement/events.js";
import type { AdobeHit, ContextData, WebSdkHit } from "./types.js";

/**
 * Extracts the page name from either hit generation: AppMeasurement's
 * top-level `pageName`, or the first Web SDK event carrying
 * `__adobe.analytics.pageName`.
 */
export function pageNameOf(hit: AdobeHit): string | undefined {
  if (hit.kind === "appmeasurement") return hit.pageName;

  for (const event of hit.events) {
    const pageName = event.analytics?.pageName;
    if (typeof pageName === "string") return pageName;
  }
  return undefined;
}

/**
 * Extracts every event id fired by a hit: AppMeasurement's `events[].id`,
 * or Web SDK's `__adobe.analytics.events` across all events in the hit.
 * Web SDK tokens like "event2=5" are reduced to their bare id ("event2").
 */
export function eventIdsOf(hit: AdobeHit): string[] {
  if (hit.kind === "appmeasurement") return hit.events.map((event) => event.id);

  const ids: string[] = [];
  for (const event of hit.events) {
    if (Array.isArray(event.analytics?.events)) {
      ids.push(...event.analytics.events.map((token) => parseEventToken(token).id));
    }
  }
  return ids;
}

/**
 * Extracts eVars from either hit generation, keyed by numeric suffix
 * ("1".."250"): AppMeasurement's `eVars`, or every Web SDK event's
 * `__adobe.analytics.eVarN`, merged in event order (later wins). eVars a
 * Web SDK implementation sends via XDM or context data instead are mapped
 * server-side and are not visible here.
 */
export function evarsOf(hit: AdobeHit): Record<string, string> {
  if (hit.kind === "appmeasurement") return hit.eVars;
  return mergeAnalyticsRecords(hit, "eVars");
}

/** Extracts props from either hit generation, keyed by numeric suffix. Same coverage as evarsOf(). */
export function propsOf(hit: AdobeHit): Record<string, string> {
  if (hit.kind === "appmeasurement") return hit.props;
  return mergeAnalyticsRecords(hit, "props");
}

function mergeAnalyticsRecords(hit: WebSdkHit, field: "eVars" | "props"): Record<string, string> {
  let merged: Record<string, string> = {};
  for (const event of hit.events) {
    const values = event.analytics?.[field];
    if (values) merged = { ...merged, ...values };
  }
  return merged;
}

/**
 * Extracts context data from either hit generation: AppMeasurement's
 * top-level `contextData`, or every Web SDK event's
 * `__adobe.analytics.contextData`, shallow-merged in event order (a later
 * event's key wins over an earlier one with the same key).
 */
export function contextDataOf(hit: AdobeHit): ContextData {
  if (hit.kind === "appmeasurement") return hit.contextData;

  let merged: ContextData = {};
  for (const event of hit.events) {
    if (event.analytics?.contextData) {
      merged = { ...merged, ...event.analytics.contextData };
    }
  }
  return merged;
}
