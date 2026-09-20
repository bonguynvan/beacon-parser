import type { FieldRule, PlanIssue } from "./types.js";

/**
 * Checks one field's value against its rule and returns an issue if it
 * fails, or undefined if it passes. `fieldLabel` is a human-readable label
 * for the field (e.g. `eVar 5`, `contextData "asset.name"`) used in the
 * issue message -- callers own the field-kind-specific labeling since this
 * function only knows about a single string value.
 */
export function checkField(
  eventName: string,
  fieldLabel: string,
  value: string | undefined,
  rule: FieldRule
): PlanIssue | undefined {
  const isRequired = rule.required !== false;
  const isPresent = value !== undefined && value !== "";

  if (!isPresent) {
    if (!isRequired) return undefined;
    return {
      eventName,
      kind: "missing-field",
      field: fieldLabel,
      message: `"${eventName}": ${fieldLabel} is required but missing`
    };
  }

  if (rule.oneOf && !rule.oneOf.includes(value)) {
    return {
      eventName,
      kind: "unexpected-value",
      field: fieldLabel,
      message: `"${eventName}": ${fieldLabel} was "${value}", expected one of [${rule.oneOf.join(", ")}]`
    };
  }

  if (rule.matches && !rule.matches.test(value)) {
    return {
      eventName,
      kind: "unexpected-value",
      field: fieldLabel,
      message: `"${eventName}": ${fieldLabel} was "${value}", expected to match ${rule.matches}`
    };
  }

  return undefined;
}
