import { describe, expect, it } from "vitest";
import { contextDataOf, type AppMeasurementHit, type WebSdkHit } from "../src/index.js";

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

describe("contextDataOf", () => {
  it("returns an AppMeasurement hit's top-level contextData", () => {
    const hit = amHit({ contextData: { asset: { name: "whitepaper-2024" } } });
    expect(contextDataOf(hit)).toEqual({ asset: { name: "whitepaper-2024" } });
  });

  it("merges contextData across every Web SDK event, later keys winning", () => {
    const hit = sdkHit({
      events: [
        { xdm: {}, analytics: { contextData: { a: "1", b: "1" } } },
        { xdm: {}, analytics: { contextData: { b: "2" } } }
      ]
    });
    expect(contextDataOf(hit)).toEqual({ a: "1", b: "2" });
  });

  it("returns an empty object when no event carries contextData", () => {
    expect(contextDataOf(sdkHit())).toEqual({});
  });
});
