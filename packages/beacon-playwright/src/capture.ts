import { detectHitType, parseHit } from "@bonv/beacon-parser";
import type { AppMeasurementHit, ParseHitOptions, WebSdkHit } from "@bonv/beacon-parser";
import type { Page, Request } from "@playwright/test";

export interface CaptureOptions {
  /**
   * Overall cap on how long to wait for hits after `action()` resolves, in
   * milliseconds. Default 2000.
   */
  timeoutMs?: number;
  /**
   * Quiet period with no new matching hit before capture is considered
   * settled, in milliseconds. Default 300. Ignored until at least one hit
   * has arrived — if nothing matches by `timeoutMs`, capture always waits
   * the full timeout before giving up (so "no hit fired" assertions are
   * reliable, not just fast).
   */
  settleMs?: number;
  /** Passed through to parseHit() for AppMeasurement list1-3 delimiter config. */
  listDelimiter?: ParseHitOptions["listDelimiter"];
}

const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_SETTLE_MS = 300;
const POLL_INTERVAL_MS = 50;

/**
 * Runs `action()` against `page`, passively observing (not intercepting)
 * network requests for the duration, and returns every AppMeasurement or
 * Web SDK hit fired as a result -- parsed with beacon-parser.
 *
 * Uses `page.on("request")` rather than `page.route()` so the tag's real
 * network behavior is unaffected: nothing here blocks, delays, or
 * fulfills a request on the page's behalf.
 */
export async function captureAdobeHits(
  page: Page,
  action: () => Promise<void> | void,
  options?: CaptureOptions
): Promise<(AppMeasurementHit | WebSdkHit)[]> {
  const hits: (AppMeasurementHit | WebSdkHit)[] = [];
  let lastHitAt = Date.now();

  const handleRequest = (request: Request): void => {
    const url = request.url();
    if (detectHitType({ url }) === "unknown") return;

    const method = request.method() === "POST" ? "POST" : "GET";
    let body: string | undefined;
    try {
      body = request.postData() ?? undefined;
    } catch {
      body = undefined;
    }

    const result = parseHit(
      { url, method, ...(body !== undefined ? { body } : {}) },
      options?.listDelimiter !== undefined ? { listDelimiter: options.listDelimiter } : undefined
    );
    if (result.kind === "unknown") return;

    hits.push(result);
    lastHitAt = Date.now();
  };

  page.on("request", handleRequest);

  try {
    await action();
    await waitForSettled(
      () => hits.length,
      () => lastHitAt,
      options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      options?.settleMs ?? DEFAULT_SETTLE_MS
    );
  } finally {
    page.off("request", handleRequest);
  }

  return hits;
}

async function waitForSettled(
  getHitCount: () => number,
  getLastHitAt: () => number,
  timeoutMs: number,
  settleMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const hasHit = getHitCount() > 0;
    const idleFor = Date.now() - getLastHitAt();
    if (hasHit && idleFor >= settleMs) return;

    const sleep = Math.max(0, Math.min(POLL_INTERVAL_MS, deadline - Date.now()));
    await new Promise((resolve) => setTimeout(resolve, sleep));
  }
}
