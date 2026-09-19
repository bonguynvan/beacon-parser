import type { AppMeasurementHit, HitInput } from "../types.js";
import { parseAppMeasurementUrl } from "./url.js";
import { parseEvents } from "./events.js";
import { parseProducts } from "./products.js";
import { extractContextData } from "./context-data.js";
import {
  eVarIndex,
  hierIndex,
  KNOWN_SCALAR_PARAMS,
  listIndex,
  propIndex
} from "./params.js";

const LINK_TRACKING_RE = /^lnk_(o|d|e)$/;

/**
 * Parses an AppMeasurement image-request or long-hit POST into a typed hit.
 * Never throws: malformed query strings or bodies degrade to empty/absent
 * fields rather than raising.
 */
export function parseAppMeasurementHit(input: HitInput): AppMeasurementHit {
  const urlInfo = parseAppMeasurementUrl(input.url);
  const bodyParams = parseFormBody(input.body);

  // Body params win on conflict: long hits repeat pageName etc. in the body.
  const params: Record<string, string> = { ...urlInfo.params, ...bodyParams };

  const raw: Record<string, string> = { ...params };

  const { contextData, consumedKeys } = extractContextData(params);

  const props: Record<string, string> = {};
  const eVars: Record<string, string> = {};
  const hierarchies: Record<string, string> = {};
  const lists: Record<string, string[]> = {};
  const unknown: Record<string, string> = {};
  const consumed = new Set(consumedKeys);

  for (const [key, value] of Object.entries(params)) {
    if (consumed.has(key) || KNOWN_SCALAR_PARAMS.has(key)) continue;

    const prop = propIndex(key);
    if (prop) {
      props[prop] = value;
      continue;
    }

    const eVar = eVarIndex(key);
    if (eVar) {
      eVars[eVar] = value;
      continue;
    }

    const hier = hierIndex(key);
    if (hier) {
      hierarchies[hier] = value;
      continue;
    }

    const list = listIndex(key);
    if (list) {
      lists[list] = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      continue;
    }

    unknown[key] = value;
  }

  const linkMatch = params["pe"] ? LINK_TRACKING_RE.exec(params["pe"]) : null;

  const hit: AppMeasurementHit = {
    kind: "appmeasurement",
    reportSuiteId: params["rsid"] ?? urlInfo.reportSuiteId,
    version: urlInfo.version,
    requestType: urlInfo.requestType,
    linkTrackingType: (linkMatch?.[1] as "o" | "d" | "e" | undefined) ?? null,
    events: parseEvents(params["events"]),
    props,
    eVars,
    hierarchies,
    lists,
    products: parseProducts(params["products"]),
    contextData,
    raw,
    unknown
  };

  if (params["pageName"]) hit.pageName = params["pageName"];
  if (params["g"]) hit.pageURL = params["g"];
  if (params["r"]) hit.referrer = params["r"];
  if (hit.linkTrackingType && params["pev1"]) hit.linkURL = params["pev1"];
  if (hit.linkTrackingType && params["pev2"]) hit.linkName = params["pev2"];
  if (params["mid"]) hit.visitorId = params["mid"];

  return hit;
}

function parseFormBody(body: string | undefined): Record<string, string> {
  const params: Record<string, string> = {};
  if (!body) return params;

  let searchParams: URLSearchParams;
  try {
    searchParams = new URLSearchParams(body);
  } catch {
    return params;
  }

  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  return params;
}
