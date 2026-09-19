import { describe, expect, it } from "vitest";
import { parseHit, type AppMeasurementHit } from "../src/index.js";

function parseAM(url: string, body?: string): AppMeasurementHit {
  const result = parseHit(body ? { url, method: "POST", body } : { url });
  if (result.kind !== "appmeasurement") {
    throw new Error(`Expected appmeasurement, got ${result.kind}`);
  }
  return result;
}

describe("AppMeasurement parsing", () => {
  it("prefers body params over query params on conflict", () => {
    const hit = parseAM(
      "https://example.com/b/ss/rsid/1/code?pageName=query-value",
      "pageName=body-value"
    );
    expect(hit.pageName).toBe("body-value");
  });

  it("never throws on a malformed products string", () => {
    const hit = parseAM("https://example.com/b/ss/rsid/1/code?products=;;;;;,,,;;;");
    expect(hit.products.length).toBeGreaterThan(0);
    for (const product of hit.products) {
      expect(product.events).toEqual([]);
      expect(product.eVars).toEqual({});
    }
  });

  it("ignores out-of-range prop/eVar indexes as unknown", () => {
    const hit = parseAM("https://example.com/b/ss/rsid/1/code?c0=x&c76=y&v0=z&v251=w");
    expect(hit.props).toEqual({});
    expect(hit.eVars).toEqual({});
    expect(hit.unknown).toEqual({ c0: "x", c76: "y", v0: "z", v251: "w" });
  });

  it("does not treat context data keys as unknown or as props", () => {
    const hit = parseAM("https://example.com/b/ss/rsid/1/code?c.foo=bar");
    expect(hit.contextData).toEqual({ foo: "bar" });
    expect(hit.unknown).toEqual({});
    expect(hit.props).toEqual({});
  });

  it("only sets linkURL/linkName when pe indicates link tracking", () => {
    const hit = parseAM("https://example.com/b/ss/rsid/1/code?pev1=http://x&pev2=name");
    expect(hit.linkTrackingType).toBeNull();
    expect(hit.linkURL).toBeUndefined();
    expect(hit.linkName).toBeUndefined();
  });
});
