import { parseHit } from "@bonv/beacon-parser";
import { describe, expect, it } from "vitest";
import { explainHit } from "../src/explain.js";
import { AM_LINK, AM_PAGEVIEW, NOT_A_HIT, SDK_DATA_OBJECT, SDK_XDM_ONLY } from "./fixtures.js";

describe("explainHit", () => {
  it("explains an AppMeasurement page view field by field, with sources", () => {
    const result = explainHit(parseHit(AM_PAGEVIEW));

    expect(result.kind).toBe("appmeasurement");
    expect(result.summary).toBe('AppMeasurement page view of "checkout" carrying 2 event(s), 1 eVar(s), 1 prop(s).');

    const byField = Object.fromEntries(result.fields.map((f) => [f.field, f]));
    expect(byField["eVar12"]?.value).toBe("checkout-step-2");
    expect(byField["eVar12"]?.meaning).toContain("configured per report suite");
    expect(byField["eVar12"]?.source).toMatch(/^https:\/\/experienceleague\.adobe\.com\//);
    expect(byField["event: event5"]?.meaning).toContain("numeric value 2.5");
  });

  it("lists unmodeled parameters as a caveat instead of interpreting them", () => {
    const result = explainHit(parseHit(AM_PAGEVIEW));
    expect(result.caveats[0]).toContain("zz");
  });

  it("explains link tracking as not a page view", () => {
    const result = explainHit(parseHit(AM_LINK));
    expect(result.summary).toContain('link-tracking hit (custom link "place-order")');
  });

  it("explains a Web SDK data-object hit including the directly-set eVar", () => {
    const result = explainHit(parseHit(SDK_DATA_OBJECT));

    expect(result.kind).toBe("websdk");
    const fields = result.fields.map((f) => f.field);
    expect(fields).toContain("events[0].data.__adobe.analytics.eVar12");
    expect(fields).toContain("events[0].data.__adobe.analytics.events");
  });

  it("says what it cannot know when a Web SDK event has no analytics block", () => {
    const result = explainHit(parseHit(SDK_XDM_ONLY));
    expect(result.caveats.join(" ")).toContain("no data.__adobe.analytics block");
  });

  it("never invents a meaning for an unrecognized request", () => {
    const result = explainHit(parseHit(NOT_A_HIT));
    expect(result.kind).toBe("unknown");
    expect(result.fields).toEqual([]);
  });

  it("every explained field's source, when present, is an Experience League docs URL", () => {
    for (const input of [AM_PAGEVIEW, AM_LINK, SDK_DATA_OBJECT]) {
      for (const field of explainHit(parseHit(input)).fields) {
        if (field.source) expect(field.source).toMatch(/^https:\/\/experienceleague\.adobe\.com\/en\/docs\//);
      }
    }
  });
});
