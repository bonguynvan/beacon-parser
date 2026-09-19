import type { HitInput, ParsedHit } from "./types.js";
import { detectHitType } from "./detect.js";
import { parseAppMeasurementHit } from "./appmeasurement/parse.js";
import { parseWebSdkHit } from "./websdk/parse.js";

/**
 * Parses a captured network hit into a normalized, typed representation.
 * Never throws: unrecognized or malformed input returns a `{ kind: "unknown" }`
 * result rather than raising.
 */
export function parseHit(input: HitInput): ParsedHit {
  try {
    const type = detectHitType(input);

    switch (type) {
      case "appmeasurement":
        return parseAppMeasurementHit(input);
      case "websdk":
        return parseWebSdkHit(input);
      default:
        return { kind: "unknown", reason: "Unrecognized hit shape", raw: input };
    }
  } catch (error) {
    return {
      kind: "unknown",
      reason: error instanceof Error ? error.message : "Unknown parse error",
      raw: input
    };
  }
}
