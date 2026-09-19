import { safeParseUrl } from "../detect.js";
import type { UnknownParams } from "../types.js";

export interface WebSdkUrlInfo {
  endpoint: "interact" | "collect" | "unknown";
  datastreamId?: string;
  /** Query params other than the ones we explicitly extracted. */
  unknown: UnknownParams;
}

const KNOWN_QUERY_KEYS = new Set(["configId"]);

/**
 * Parses the request URL of a Web SDK hit: a path like /ee/{env}/interact
 * or /ee/{env}/collect, plus the configId (datastream id) query param
 * when present.
 */
export function parseWebSdkUrl(rawUrl: string): WebSdkUrlInfo {
  const url = safeParseUrl(rawUrl);
  const unknown: UnknownParams = {};

  if (!url) {
    return { endpoint: "unknown", unknown };
  }

  let endpoint: WebSdkUrlInfo["endpoint"] = "unknown";
  if (/\/interact(?:[/?#]|$)/.test(url.pathname)) {
    endpoint = "interact";
  } else if (/\/collect(?:[/?#]|$)/.test(url.pathname)) {
    endpoint = "collect";
  }

  let datastreamId: string | undefined;
  for (const [key, value] of url.searchParams.entries()) {
    if (key === "configId") {
      datastreamId = value;
      continue;
    }
    if (!KNOWN_QUERY_KEYS.has(key)) {
      unknown[key] = value;
    }
  }

  return { endpoint, datastreamId, unknown };
}
