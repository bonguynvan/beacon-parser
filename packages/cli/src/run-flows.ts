import { chromium } from "playwright";
import { detectHitType, type AdobeHit } from "@bonv/beacon-parser";
import { captureAdobeHits } from "@bonv/beacon-playwright";
import { validate } from "@bonv/tracking-plan";
import type { ValidateResult } from "@bonv/tracking-plan";
import type { BeaconConfig } from "./types.js";

export interface FlowResult {
  name: string;
  result: ValidateResult;
  /** Every Adobe hit captured during the flow, parsed, in the order it fired. */
  hits: AdobeHit[];
}

export interface RunFlowsOptions {
  /**
   * Abort AppMeasurement/Web SDK requests after they're captured, so the
   * page's own tags don't send test traffic into a real report suite. Hits
   * are still observed and validated -- a request is seen before it's
   * aborted. Off by default, matching a plain browser run. Aborting a Web
   * SDK request means the page never gets a response, which can change what
   * a flow does afterwards.
   */
  blockHits?: boolean;
}

/**
 * Runs each named flow in its own browser context (isolated cookies/storage
 * per flow, one shared browser process for the whole run), capturing hits
 * and validating them against the config's plan.
 */
export async function runFlows(
  config: BeaconConfig,
  flowNames: string[],
  options: RunFlowsOptions = {}
): Promise<FlowResult[]> {
  const browser = await chromium.launch();
  const results: FlowResult[] = [];

  try {
    for (const name of flowNames) {
      const flow = config.flows[name];
      if (!flow) throw new Error(`Unknown flow "${name}"`);

      const context = await browser.newContext(config.baseURL ? { baseURL: config.baseURL } : {});
      const page = await context.newPage();

      if (options.blockHits) {
        await page.route(
          (url) => detectHitType({ url: url.toString() }) !== "unknown",
          (route) => route.abort()
        );
      }

      const hits = await captureAdobeHits(page, () => flow(page));
      results.push({ name, result: validate(hits, config.plan), hits });

      await context.close();
    }
  } finally {
    await browser.close();
  }

  return results;
}
