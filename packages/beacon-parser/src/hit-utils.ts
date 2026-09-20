import type { AdobeHit, ContextData } from "./types.js";

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
 * or Web SDK's `__adobe.analytics.events[]` across all events in the hit.
 */
export function eventIdsOf(hit: AdobeHit): string[] {
  if (hit.kind === "appmeasurement") return hit.events.map((event) => event.id);

  const ids: string[] = [];
  for (const event of hit.events) {
    if (Array.isArray(event.analytics?.events)) {
      ids.push(...event.analytics.events);
    }
  }
  return ids;
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
