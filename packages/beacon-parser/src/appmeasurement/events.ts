import type { EventEntry } from "../types.js";

/**
 * Parses a comma-separated events string, e.g. "event1,event2=5,purchase".
 * An entry may carry a numeric serialization value after "=" (event2=5).
 */
export function parseEvents(raw: string | undefined): EventEntry[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part): EventEntry => {
      const eqIndex = part.indexOf("=");
      if (eqIndex === -1) {
        return { id: part };
      }

      const id = part.slice(0, eqIndex);
      const value = Number(part.slice(eqIndex + 1));

      return Number.isFinite(value) ? { id, value } : { id };
    });
}
