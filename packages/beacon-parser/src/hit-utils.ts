import type { AdobeHit } from "./types.js";

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
