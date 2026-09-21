import type { AdobeHit } from "@bonv/beacon-parser";

export interface FieldRule {
  /** Defaults to true: the field must be present on every matching hit. */
  required?: boolean;
  /** Allowed literal values. Omit to accept any non-empty value. */
  oneOf?: string[];
  /** Pattern the value must match. Checked in addition to `oneOf` when both are set. */
  matches?: RegExp;
}

export interface EventPlan {
  /** Human-readable name, used in issue messages. */
  name: string;
  /** Recognizes which captured hits are an instance of this event. */
  match: (hit: AdobeHit) => boolean;
  /** eVars keyed by numeric suffix ("1".."250"). Checked on AppMeasurement eVars and Web SDK data.__adobe.analytics.eVarN. */
  eVars?: Record<string, FieldRule>;
  /** Props keyed by numeric suffix ("1".."75"). Same coverage as eVars. */
  props?: Record<string, FieldRule>;
  /** Adobe event ids (e.g. "event1", "purchase") that must be present on every matching hit. */
  events?: string[];
  /** contextData keys (dot-path), checked on both AppMeasurement and Web SDK hits. */
  contextData?: Record<string, FieldRule>;
}

export interface TrackingPlan {
  name: string;
  events: EventPlan[];
}

export type PlanIssueKind = "missing-hit" | "missing-field" | "unexpected-value" | "unmatched-hit";

export interface PlanIssue {
  eventName: string;
  kind: PlanIssueKind;
  /** The eVar/prop/contextData/event field this issue is about, when applicable. */
  field?: string;
  message: string;
}

export interface ValidateOptions {
  /** When true, also reports hits that matched no EventPlan as "unmatched-hit" issues. Defaults to false. */
  strict?: boolean;
}

export interface ValidateResult {
  passed: boolean;
  issues: PlanIssue[];
  /** Captured hits that matched no EventPlan. Only populated when options.strict is true. */
  unmatchedHits: AdobeHit[];
}
