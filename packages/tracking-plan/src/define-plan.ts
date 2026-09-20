import type { TrackingPlan } from "./types.js";

/**
 * Identity function -- exists purely so a plan literal gets `TrackingPlan`'s
 * type checking and editor autocomplete without an explicit type annotation.
 */
export function definePlan(plan: TrackingPlan): TrackingPlan {
  return plan;
}
