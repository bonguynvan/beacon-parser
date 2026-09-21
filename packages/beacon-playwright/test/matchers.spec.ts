import { test, expect as baseExpect } from "@playwright/test";
import type { AppMeasurementHit, WebSdkHit } from "@bonv/beacon-parser";
import { adobeMatchers } from "../src/index.js";

const expect = baseExpect.extend(adobeMatchers);

function amHit(overrides: Partial<AppMeasurementHit> = {}): AppMeasurementHit {
  return {
    kind: "appmeasurement",
    reportSuiteId: "rsid",
    version: "1",
    requestType: "ss",
    linkTrackingType: null,
    events: [{ id: "event5" }],
    props: { "3": "checkout-flow" },
    eVars: { "12": "checkout" },
    hierarchies: {},
    lists: {},
    products: [],
    contextData: {},
    raw: {},
    unknown: {},
    pageName: "checkout",
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

test("toHaveAdobeHit matches by kind and pageName", () => {
  expect([amHit()]).toHaveAdobeHit({ kind: "appmeasurement", pageName: "checkout" });
});

test("toHaveAdobeHit fails when pageName doesn't match", () => {
  expect(() => expect([amHit()]).toHaveAdobeHit({ pageName: "other" })).toThrow();
});

test("toHaveAdobeEvent matches an AppMeasurement event id", () => {
  expect([amHit()]).toHaveAdobeEvent("event5");
});

test("toHaveAdobeEvent matches a Web SDK analytics event id", () => {
  expect([sdkHit()]).toHaveAdobeEvent("event5");
});

test("toHaveEvar matches an AppMeasurement eVar", () => {
  expect([amHit()]).toHaveEvar(12, "checkout");
});

test("toHaveProp matches an AppMeasurement prop", () => {
  expect([amHit()]).toHaveProp(3, "checkout-flow");
});

const sdkWithNumberedVars = sdkHit({
  events: [
    { xdm: {}, analytics: { eVars: { "12": "checkout" }, props: { "3": "checkout-flow" } } }
  ]
});

test("toHaveEvar matches a Web SDK data.__adobe.analytics eVar", () => {
  expect([sdkWithNumberedVars]).toHaveEvar(12, "checkout");
});

test("toHaveProp matches a Web SDK data.__adobe.analytics prop", () => {
  expect([sdkWithNumberedVars]).toHaveProp(3, "checkout-flow");
});

test("toHaveEvar doesn't match a Web SDK hit that only sets the value via contextData", () => {
  const viaContextData = sdkHit({
    events: [{ xdm: {}, analytics: { contextData: { eVar12: "checkout" } } }]
  });
  expect([viaContextData]).not.toHaveEvar(12, "checkout");
});
