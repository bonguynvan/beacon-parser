import { describe, expect, it } from "vitest";
import type { AppMeasurementHit, WebSdkHit } from "@bonv/beacon-parser";
import { definePlan, validate } from "../src/index.js";

function amHit(overrides: Partial<AppMeasurementHit> = {}): AppMeasurementHit {
  return {
    kind: "appmeasurement",
    reportSuiteId: "rsid",
    version: "1",
    requestType: "ss",
    linkTrackingType: null,
    events: [],
    props: {},
    eVars: {},
    hierarchies: {},
    lists: {},
    products: [],
    contextData: {},
    raw: {},
    unknown: {},
    ...overrides
  };
}

function sdkHit(overrides: Partial<WebSdkHit> = {}): WebSdkHit {
  return {
    kind: "websdk",
    endpoint: "interact",
    events: [],
    raw: null,
    unknown: {},
    ...overrides
  };
}

describe("validate", () => {
  it("passes when a matching hit satisfies every rule", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [
        {
          name: "purchase",
          match: (hit) => hit.kind === "appmeasurement" && hit.events.some((e) => e.id === "purchase"),
          eVars: { "12": { oneOf: ["checkout"] } },
          events: ["purchase"]
        }
      ]
    });

    const hits = [amHit({ events: [{ id: "purchase" }], eVars: { "12": "checkout" } })];
    const result = validate(hits, plan);

    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("reports missing-hit when no hit matches an event plan", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [{ name: "purchase", match: () => false }]
    });

    const result = validate([amHit()], plan);

    expect(result.passed).toBe(false);
    expect(result.issues).toEqual([
      {
        eventName: "purchase",
        kind: "missing-hit",
        message: '"purchase": expected at least one matching hit, but none fired'
      }
    ]);
  });

  it("reports missing-field for a required eVar that's absent", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [
        {
          name: "purchase",
          match: (hit) => hit.kind === "appmeasurement",
          eVars: { "12": {} }
        }
      ]
    });

    const result = validate([amHit()], plan);

    expect(result.passed).toBe(false);
    expect(result.issues).toEqual([
      {
        eventName: "purchase",
        kind: "missing-field",
        field: "eVar 12",
        message: '"purchase": eVar 12 is required but missing'
      }
    ]);
  });

  it("does not flag an eVar declared optional (required: false) when absent", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [
        {
          name: "purchase",
          match: (hit) => hit.kind === "appmeasurement",
          eVars: { "12": { required: false } }
        }
      ]
    });

    expect(validate([amHit()], plan).passed).toBe(true);
  });

  it("reports unexpected-value when an eVar value isn't in oneOf", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [
        {
          name: "purchase",
          match: (hit) => hit.kind === "appmeasurement",
          eVars: { "12": { oneOf: ["checkout"] } }
        }
      ]
    });

    const result = validate([amHit({ eVars: { "12": "wrong-value" } })], plan);

    expect(result.passed).toBe(false);
    expect(result.issues[0]).toMatchObject({ kind: "unexpected-value", field: "eVar 12" });
  });

  it("reports missing-field for a required event id not fired", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [
        {
          name: "purchase",
          match: (hit) => hit.kind === "appmeasurement",
          events: ["purchase"]
        }
      ]
    });

    const result = validate([amHit({ events: [{ id: "other" }] })], plan);

    expect(result.issues).toEqual([
      {
        eventName: "purchase",
        kind: "missing-field",
        field: 'event "purchase"',
        message: '"purchase": event "purchase" is required but was not fired'
      }
    ]);
  });

  it("skips eVar/prop rules for Web SDK hits (no numbered fields on the wire)", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [
        {
          name: "purchase",
          match: (hit) => hit.kind === "websdk",
          eVars: { "12": {} }
        }
      ]
    });

    expect(validate([sdkHit()], plan).passed).toBe(true);
  });

  it("checks contextData on both hit generations via a dot-path key", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [
        {
          name: "purchase",
          match: () => true,
          contextData: { "asset.name": { oneOf: ["whitepaper-2024"] } }
        }
      ]
    });

    const am = amHit({ contextData: { asset: { name: "whitepaper-2024" } } });
    const sdk = sdkHit({
      events: [{ xdm: {}, analytics: { contextData: { asset: { name: "wrong" } } } }]
    });

    expect(validate([am], plan).passed).toBe(true);
    expect(validate([sdk], plan).passed).toBe(false);
  });

  it("reports unmatched-hit only when strict is true", () => {
    const plan = definePlan({
      name: "checkout flow",
      events: [{ name: "purchase", match: (hit) => hit.kind === "appmeasurement" && hit.events.length > 0 }]
    });

    const hits = [amHit({ events: [{ id: "purchase" }] }), amHit({ events: [] })];

    expect(validate(hits, plan).passed).toBe(true);

    const strictResult = validate(hits, plan, { strict: true });
    expect(strictResult.passed).toBe(false);
    expect(strictResult.unmatchedHits).toHaveLength(1);
    expect(strictResult.issues.some((issue) => issue.kind === "unmatched-hit")).toBe(true);
  });
});
