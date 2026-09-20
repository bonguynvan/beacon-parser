import type { Page } from "playwright";
import type { TrackingPlan } from "@bonv/tracking-plan";

export type Flow = (page: Page) => Promise<void> | void;

export interface BeaconConfig {
  /** Passed to browser.newContext() so flows can page.goto() a relative path. Optional -- a flow can also goto() an absolute URL itself. */
  baseURL?: string;
  plan: TrackingPlan;
  flows: Record<string, Flow>;
}
