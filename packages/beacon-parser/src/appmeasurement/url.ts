import { safeParseUrl } from "../detect.js";

export interface AppMeasurementUrlInfo {
  reportSuiteId: string | null;
  version: string | null;
  requestType: string | null;
  /** Query params from the URL, e.g. GET hits or the pageName-only part of POST hits. */
  params: Record<string, string>;
}

const PATH_RE = /\/b\/(ss)\/([^/]+)\/([^/]+)\/[^/?#]+/;

/**
 * Parses the /b/ss/{rsid}/{version}/{code} path segments and query string.
 * First-party CNAME domains change the host, not this path shape, so we
 * intentionally never look at url.hostname here.
 */
export function parseAppMeasurementUrl(rawUrl: string): AppMeasurementUrlInfo {
  const url = safeParseUrl(rawUrl);
  const params: Record<string, string> = {};

  if (!url) {
    return { reportSuiteId: null, version: null, requestType: null, params };
  }

  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value;
  }

  const match = PATH_RE.exec(url.pathname);
  if (!match) {
    return { reportSuiteId: null, version: null, requestType: null, params };
  }

  const [, requestType, rsid, version] = match;
  return {
    reportSuiteId: rsid ?? null,
    version: version ?? null,
    requestType: requestType ?? null,
    params
  };
}
