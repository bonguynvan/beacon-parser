import { describe, expect, it } from "vitest";
import { detectHitType, parseHit } from "../src/index.js";

describe("detectHitType", () => {
  it("detects appmeasurement from the /b/ss/ path", () => {
    expect(detectHitType({ url: "https://example.com/b/ss/rsid/1/code" })).toBe(
      "appmeasurement"
    );
  });

  it("detects websdk from the /ee/*/interact path", () => {
    expect(detectHitType({ url: "https://example.com/ee/v1/interact" })).toBe("websdk");
  });

  it("detects websdk from the /ee/*/collect path", () => {
    expect(detectHitType({ url: "https://example.com/ee/v1/collect" })).toBe("websdk");
  });

  it("detects by path regardless of hostname (first-party CNAME domains)", () => {
    expect(detectHitType({ url: "https://data.examplebrand.com/b/ss/rsid/1/code" })).toBe(
      "appmeasurement"
    );
  });

  it("returns unknown for unrecognized shapes", () => {
    expect(detectHitType({ url: "https://example.com/some/other/path" })).toBe("unknown");
  });

  it("returns unknown for invalid input", () => {
    expect(detectHitType({ url: "" })).toBe("unknown");
    expect(detectHitType({} as { url: string })).toBe("unknown");
  });
});

describe("parseHit", () => {
  it("routes to the appmeasurement parser", () => {
    const result = parseHit({ url: "https://example.com/b/ss/rsid/1/code?pageName=home" });
    expect(result.kind).toBe("appmeasurement");
  });

  it("routes to the websdk parser", () => {
    const result = parseHit({
      url: "https://example.com/ee/v1/interact",
      method: "POST",
      body: '{"events":[]}'
    });
    expect(result.kind).toBe("websdk");
  });

  it("falls back to unknown for unrecognized input", () => {
    const result = parseHit({ url: "https://example.com/not-a-tracking-endpoint" });
    expect(result).toEqual({
      kind: "unknown",
      reason: "Unrecognized hit shape",
      raw: { url: "https://example.com/not-a-tracking-endpoint" }
    });
  });
});
