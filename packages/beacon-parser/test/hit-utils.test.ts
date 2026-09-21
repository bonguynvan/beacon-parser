import { describe, expect, it } from "vitest";
import {
  contextDataOf,
  eventIdsOf,
  evarsOf,
  parseHit,
  propsOf,
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

describe("evarsOf / propsOf", () => {
  it("returns an AppMeasurement hit's eVars and props", () => {
    const hit = amHit({ eVars: { "12": "checkout" }, props: { "3": "flow" } });
    expect(evarsOf(hit)).toEqual({ "12": "checkout" });
    expect(propsOf(hit)).toEqual({ "3": "flow" });
  });

  it("merges Web SDK data-object eVars across events, later events winning", () => {
    const hit = sdkHit({
      events: [
        { xdm: {}, analytics: { eVars: { "1": "a", "2": "a" } } },
        { xdm: {}, analytics: { eVars: { "2": "b" } } }
      ]
    });
    expect(evarsOf(hit)).toEqual({ "1": "a", "2": "b" });
  });

  it("returns an empty object when a Web SDK hit sets none", () => {
    expect(evarsOf(sdkHit())).toEqual({});
    expect(propsOf(sdkHit())).toEqual({});
  });
});

describe("eventIdsOf for Web SDK tokens", () => {
  it("reduces value/serialization tokens to bare ids", () => {
    const hit = sdkHit({
      events: [{ xdm: {}, analytics: { events: ["event1", "event2=5", "event3:abc123"] } }]
    });
    expect(eventIdsOf(hit)).toEqual(["event1", "event2", "event3"]);
  });
});

describe("Web SDK data object parsing", () => {
  function analyticsOf(analytics: unknown) {
    const hit = parseHit({
      url: "https://edge.adobedc.net/ee/v1/interact?configId=fake-datastream-id",
      method: "POST",
      body: JSON.stringify({ events: [{ xdm: {}, data: { __adobe: { analytics } } }] })
    });
    if (hit.kind !== "websdk") throw new Error("expected a websdk hit");
    return hit.events[0]?.analytics;
  }

  it("reads the events-variable string form", () => {
    expect(analyticsOf({ events: "event1, event2=5" })?.events).toEqual(["event1", "event2=5"]);
  });

  it("reads eVarN/vN and propN/cN, with the long form winning when both are sent", () => {
    const analytics = analyticsOf({ v1: "short", eVar1: "long", c2: "p", prop3: "q" });
    expect(analytics?.eVars).toEqual({ "1": "long" });
    expect(analytics?.props).toEqual({ "2": "p", "3": "q" });
  });

  it("coerces numeric values and ignores out-of-range, non-scalar, and lookalike keys", () => {
    const analytics = analyticsOf({
      eVar5: 42,
      eVar0: "zero",
      eVar251: "too-high",
      prop76: "too-high",
      eVar7: { nested: true },
      eVars: "not-a-documented-key",
      contextData: { a: "1" },
      cx: "lookalike"
    });
    expect(analytics?.eVars).toEqual({ "5": "42" });
    expect(analytics?.props).toBeUndefined();
  });

  it("removes a raw key that collides with a typed field name but doesn't normalize", () => {
    const analytics = analyticsOf({ eVars: "oops", props: [1], events: 5 });
    expect(analytics?.eVars).toBeUndefined();
    expect(analytics?.props).toBeUndefined();
    expect(analytics?.events).toBeUndefined();
  });

  it("only accepts documented linkType values", () => {
    expect(analyticsOf({ linkType: "d" })?.linkType).toBe("d");
    expect(analyticsOf({ linkType: "lnk_o" })?.linkType).toBeUndefined();
  });

  it("never throws on hostile shapes", () => {
    for (const analytics of [null, [], "x", 5, { events: 5 }, { events: [1, null, {}] }, { eVar1: null }]) {
      expect(() => analyticsOf(analytics)).not.toThrow();
    }
  });
});
