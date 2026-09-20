import { contextDataOf, eventIdsOf, type AdobeHit } from "@bonv/beacon-parser";
import { checkField } from "./field-rules.js";
import type { EventPlan, FieldRule, PlanIssue, TrackingPlan, ValidateOptions, ValidateResult } from "./types.js";

/**
 * Runs every hit captured from a flow against a tracking plan. For each
 * `EventPlan`, every hit its `match()` accepts is checked against the
 * declared eVars/props/events/contextData -- an event with zero matching
 * hits is reported as `missing-hit`, distinct from a matching hit with a
 * field problem (`missing-field` / `unexpected-value`).
 *
 * `eVars`/`props` rules are only checked on AppMeasurement hits (Web SDK
 * carries no numbered eVar/prop on the wire -- that mapping is server-side,
 * in the datastream config), matching the same generation split
 * `diffAdobeHits` uses.
 */
export function validate(hits: AdobeHit[], plan: TrackingPlan, options: ValidateOptions = {}): ValidateResult {
  const issues: PlanIssue[] = [];
  const matchedHits = new Set<AdobeHit>();

  for (const eventPlan of plan.events) {
    const matches = hits.filter((hit) => eventPlan.match(hit));
    if (matches.length === 0) {
      issues.push({
        eventName: eventPlan.name,
        kind: "missing-hit",
        message: `"${eventPlan.name}": expected at least one matching hit, but none fired`
      });
      continue;
    }

    for (const hit of matches) {
      matchedHits.add(hit);
      issues.push(...checkHit(hit, eventPlan));
    }
  }

  const unmatchedHits = options.strict ? hits.filter((hit) => !matchedHits.has(hit)) : [];
  issues.push(
    ...unmatchedHits.map(
      (): PlanIssue => ({
        eventName: "(unmatched)",
        kind: "unmatched-hit",
        message: `A captured hit matched no event in plan "${plan.name}"`
      })
    )
  );

  return { passed: issues.length === 0, issues, unmatchedHits };
}

function checkHit(hit: AdobeHit, eventPlan: EventPlan): PlanIssue[] {
  const issues: PlanIssue[] = [];

  if (eventPlan.events) {
    const actualIds = eventIdsOf(hit);
    for (const id of eventPlan.events) {
      if (!actualIds.includes(id)) {
        issues.push({
          eventName: eventPlan.name,
          kind: "missing-field",
          field: `event "${id}"`,
          message: `"${eventPlan.name}": event "${id}" is required but was not fired`
        });
      }
    }
  }

  if (hit.kind === "appmeasurement") {
    issues.push(...checkFieldMap(eventPlan.name, eventPlan.eVars, hit.eVars, "eVar"));
    issues.push(...checkFieldMap(eventPlan.name, eventPlan.props, hit.props, "prop"));
  }

  if (eventPlan.contextData) {
    const contextData = contextDataOf(hit);
    for (const [key, rule] of Object.entries(eventPlan.contextData)) {
      const value = stringValueAt(contextData, key);
      const issue = checkField(eventPlan.name, `contextData "${key}"`, value, rule);
      if (issue) issues.push(issue);
    }
  }

  return issues;
}

function checkFieldMap(
  eventName: string,
  rules: Record<string, FieldRule> | undefined,
  values: Record<string, string>,
  label: "eVar" | "prop"
): PlanIssue[] {
  if (!rules) return [];

  const issues: PlanIssue[] = [];
  for (const [suffix, rule] of Object.entries(rules)) {
    const issue = checkField(eventName, `${label} ${suffix}`, values[suffix], rule);
    if (issue) issues.push(issue);
  }
  return issues;
}

/** Reads a dot-path key (e.g. "asset.name") out of a nested contextData object, coercing the leaf to a string. */
function stringValueAt(data: Record<string, unknown>, path: string): string | undefined {
  const segments = path.split(".");
  let current: unknown = data;

  for (const segment of segments) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  if (current === undefined || current === null) return undefined;
  return typeof current === "string" ? current : String(current);
}
