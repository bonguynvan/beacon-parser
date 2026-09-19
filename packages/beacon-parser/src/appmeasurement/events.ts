import type { EventEntry } from "../types.js";

/**
 * Parses a comma-separated events string, e.g. "event1,event2=5,event3:abc123".
 * Two independent suffixes exist: "=" sets/increments a numeric value
 * (event2=5), ":" attaches a serialization/dedup id (event3:abc123). They
 * are not documented as combinable on a single event, so whichever
 * delimiter appears first in a token wins.
 */
export function parseEvents(raw: string | undefined): EventEntry[] {
  if (!raw) return [];

  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map(parseEventToken);
}

/**
 * Parses a single "eventN", "eventN=value", or "eventN:serializationId"
 * token. Shared with products.ts, which uses the same "=" / ":" suffixes on
 * pipe-delimited event tokens within a product entry.
 */
export function parseEventToken(token: string): EventEntry {
  const colonIndex = token.indexOf(":");
  const eqIndex = token.indexOf("=");

  if (colonIndex !== -1 && (eqIndex === -1 || colonIndex < eqIndex)) {
    return {
      id: token.slice(0, colonIndex),
      serializationId: token.slice(colonIndex + 1)
    };
  }

  if (eqIndex !== -1) {
    const id = token.slice(0, eqIndex);
    const value = Number(token.slice(eqIndex + 1));
    return Number.isFinite(value) ? { id, value } : { id };
  }

  return { id: token };
}
