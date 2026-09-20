import { chromium } from "playwright";
import { captureAdobeHits } from "@bonv/beacon-playwright";
import { validate } from "@bonv/tracking-plan";
import type { ValidateResult } from "@bonv/tracking-plan";
import type { BeaconConfig } from "./types.js";

export interface FlowResult {
  name: string;
  result: ValidateResult;
}

/**
 * Runs each named flow in its own browser context (isolated cookies/storage
 * per flow, one shared browser process for the whole run), capturing hits
 * and validating them against the config's plan.
 */
export async function runFlows(config: BeaconConfig, flowNames: string[]): Promise<FlowResult[]> {
  const browser = await chromium.launch();
  const results: FlowResult[] = [];

  try {
    for (const name of flowNames) {
      const flow = config.flows[name];
      if (!flow) throw new Error(`Unknown flow "${name}"`);

      const context = await browser.newContext(config.baseURL ? { baseURL: config.baseURL } : {});
      const page = await context.newPage();

      const hits = await captureAdobeHits(page, () => flow(page));
      results.push({ name, result: validate(hits, config.plan) });

      await context.close();
    }
  } finally {
    await browser.close();
  }

  return results;
}
