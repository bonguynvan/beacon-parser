import { describe, expect, it } from "vitest";
import {
  diffAdobeHits,
  pageNameOf,
  type AppMeasurementHit,
  type WebSdkHit
} from "../src/index.js";

function amHit(overrides: Partial<AppMeasurementHit> = {}): AppMeasurementHit {
  return {
    kind: "appmeasurement",
    reportSuiteId: "rsid",
    version: "1",
    requestType: "ss",
    linkTrackingType: null,
    events: [{ id: "event5" }],
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
    events: [{ xdm: {}, analytics: { pageName: "checkout", events: ["event5"] } }],
    raw: null,
    unknown: {},
    ...overrides
  };
}

describe("diffAdobeHits", () => {
  it("reports no differences for identical hit sets", () => {
    const hits = [amHit({ pageName: "checkout" })];
    const diff = diffAdobeHits(hits, hits);

    expect(diff.missingEvents).toEqual([]);
    expect(diff.addedEvents).toEqual([]);
    expect(diff.changedEvars).toEqual([]);
    expect(diff.changedProps).toEqual([]);
    expect(diff.missingHits).toEqual([]);
    expect(diff.addedHits).toEqual([]);
  });

  it("detects a missing event on the same page", () => {
    const before = [amHit({ pageName: "checkout", events: [{ id: "event5" }, { id: "event6" }] })];
    const after = [amHit({ pageName: "checkout", events: [{ id: "event5" }] })];

    const diff = diffAdobeHits(before, after);
    expect(diff.missingEvents).toEqual(["event6"]);
    expect(diff.addedEvents).toEqual([]);
  });

  it("detects an added event on the same page", () => {
    const before = [amHit({ pageName: "checkout", events: [{ id: "event5" }] })];
    const after = [amHit({ pageName: "checkout", events: [{ id: "event5" }, { id: "event7" }] })];

    const diff = diffAdobeHits(before, after);
    expect(diff.addedEvents).toEqual(["event7"]);
    expect(diff.missingEvents).toEqual([]);
  });

  it("detects a changed eVar value", () => {
    const before = [amHit({ pageName: "checkout", eVars: { "12": "old-value" } })];
    const after = [amHit({ pageName: "checkout", eVars: { "12": "new-value" } })];

    const diff = diffAdobeHits(before, after);
    expect(diff.changedEvars).toEqual([
      { index: "12", before: "old-value", after: "new-value", pageName: "checkout" }
    ]);
  });

  it("detects a changed prop value", () => {
    const before = [amHit({ pageName: "checkout", props: { "3": "old-flow" } })];
    const after = [amHit({ pageName: "checkout", props: { "3": "new-flow" } })];

    const diff = diffAdobeHits(before, after);
    expect(diff.changedProps).toEqual([
      { index: "3", before: "old-flow", after: "new-flow", pageName: "checkout" }
    ]);
  });

  it("treats an eVar present on only one side as a change against an empty string", () => {
    const before = [amHit({ pageName: "checkout", eVars: {} })];
    const after = [amHit({ pageName: "checkout", eVars: { "12": "new-value" } })];

    const diff = diffAdobeHits(before, after);
    expect(diff.changedEvars).toEqual([
      { index: "12", before: "", after: "new-value", pageName: "checkout" }
    ]);
  });

  it("reports a hit with no corresponding pageName in after as missing", () => {
    const before = [amHit({ pageName: "checkout" }), amHit({ pageName: "confirmation" })];
    const after = [amHit({ pageName: "checkout" })];

    const diff = diffAdobeHits(before, after);
    expect(diff.missingHits).toHaveLength(1);
    expect(diff.missingHits[0] && pageNameOf(diff.missingHits[0])).toBe("confirmation");
    expect(diff.addedHits).toEqual([]);
  });

  it("reports a hit with no corresponding pageName in before as added", () => {
    const before = [amHit({ pageName: "checkout" })];
    const after = [amHit({ pageName: "checkout" }), amHit({ pageName: "confirmation" })];

    const diff = diffAdobeHits(before, after);
    expect(diff.addedHits).toHaveLength(1);
    expect(diff.addedHits[0] && pageNameOf(diff.addedHits[0])).toBe("confirmation");
    expect(diff.missingHits).toEqual([]);
  });

  it("matches positionally within the same pageName group when counts match", () => {
    const before = [
      amHit({ pageName: "checkout", eVars: { "1": "a" } }),
      amHit({ pageName: "checkout", eVars: { "1": "b" } })
    ];
    const after = [
      amHit({ pageName: "checkout", eVars: { "1": "a-new" } }),
      amHit({ pageName: "checkout", eVars: { "1": "b-new" } })
    ];

    const diff = diffAdobeHits(before, after);
    expect(diff.changedEvars).toEqual([
      { index: "1", before: "a", after: "a-new", pageName: "checkout" },
      { index: "1", before: "b", after: "b-new", pageName: "checkout" }
    ]);
  });

  it("flags kindChanged for an AppMeasurement -> Web SDK pair and skips eVar/prop diffing", () => {
    const before = [amHit({ pageName: "checkout", eVars: { "12": "checkout" } })];
    const after = [sdkHit()];

    const diff = diffAdobeHits(before, after);
    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0]?.kindChanged).toBe(true);
    expect(diff.entries[0]?.missingEvents).toEqual([]);
    expect(diff.entries[0]?.addedEvents).toEqual([]);
    expect(diff.changedEvars).toEqual([]);
    expect(diff.changedProps).toEqual([]);
  });

  it("groups hits with no pageName into a fallback bucket matched positionally", () => {
    const before = [amHit({ pageName: undefined, events: [{ id: "event1" }] })];
    const after = [amHit({ pageName: undefined, events: [{ id: "event2" }] })];

    const diff = diffAdobeHits(before, after);
    expect(diff.entries).toHaveLength(1);
    expect(diff.missingEvents).toEqual(["event1"]);
    expect(diff.addedEvents).toEqual(["event2"]);
  });

  it("returns empty results for two empty hit sets", () => {
    const diff = diffAdobeHits([], []);
    expect(diff.entries).toEqual([]);
    expect(diff.missingHits).toEqual([]);
    expect(diff.addedHits).toEqual([]);
  });
});
