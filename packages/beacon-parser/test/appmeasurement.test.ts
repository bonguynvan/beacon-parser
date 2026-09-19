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

  describe("event serialization (colon syntax)", () => {
    it("extracts a serialization id from event3:abc123 as a separate field", () => {
      const hit = parseAM("https://example.com/b/ss/rsid/1/code?events=event3:abc123");
      expect(hit.events).toEqual([{ id: "event3", serializationId: "abc123" }]);
    });

    it("keeps = numeric values and : serialization ids independent per event", () => {
      const hit = parseAM(
        "https://example.com/b/ss/rsid/1/code?events=event1,event2:id-a,event3=5,event4:id-b"
      );
      expect(hit.events).toEqual([
        { id: "event1" },
        { id: "event2", serializationId: "id-a" },
        { id: "event3", value: 5 },
        { id: "event4", serializationId: "id-b" }
      ]);
    });

    it("does not set value when only a serialization id is present", () => {
      const hit = parseAM("https://example.com/b/ss/rsid/1/code?events=event1:abc");
      expect(hit.events[0]?.value).toBeUndefined();
    });

    it("does not set serializationId when only a numeric value is present", () => {
      const hit = parseAM("https://example.com/b/ss/rsid/1/code?events=event1=5");
      expect(hit.events[0]?.serializationId).toBeUndefined();
    });

    it("treats a bare event with neither : nor = as id-only", () => {
      const hit = parseAM("https://example.com/b/ss/rsid/1/code?events=purchase");
      expect(hit.events).toEqual([{ id: "purchase" }]);
    });
  });
});
