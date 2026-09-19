import { describe, expect, it } from "vitest";
import { parseHit, type WebSdkHit } from "../src/index.js";

function parseSdk(url: string, body?: string): WebSdkHit {
  const result = parseHit(body ? { url, method: "POST", body } : { url });
  if (result.kind !== "websdk") {
    throw new Error(`Expected websdk, got ${result.kind}`);
  }
  return result;
}

describe("Web SDK parsing", () => {
  it("returns empty events and raw=null for a missing/unparseable body", () => {
    const hit = parseSdk("https://example.com/ee/v1/interact");
    expect(hit.events).toEqual([]);
    expect(hit.raw).toBeNull();
  });

  it("returns empty events for malformed JSON rather than throwing", () => {
    const hit = parseSdk("https://example.com/ee/v1/interact", "{not valid json");
    expect(hit.events).toEqual([]);
    expect(hit.raw).toBeNull();
  });

  it("returns empty events when events is not an array", () => {
    const hit = parseSdk(
      "https://example.com/ee/v1/interact",
      JSON.stringify({ events: "oops" })
    );
    expect(hit.events).toEqual([]);
  });

  it("skips non-object entries in the events array", () => {
    const hit = parseSdk(
      "https://example.com/ee/v1/interact",
      JSON.stringify({ events: [null, "string", 42, { xdm: { a: 1 } }] })
    );
    expect(hit.events).toEqual([{ xdm: { a: 1 } }]);
  });

  it("defaults xdm to {} when an event entry omits it", () => {
    const hit = parseSdk("https://example.com/ee/v1/interact", JSON.stringify({ events: [{}] }));
    expect(hit.events).toEqual([{ xdm: {} }]);
  });

  it("marks endpoint unknown for a path that isn't interact or collect", () => {
    const hit = parseHit({ url: "https://example.com/ee/v1/something-else" });
    expect(hit.kind).toBe("unknown");
  });

  it("extracts the analytics block from xdm when data is absent", () => {
    const hit = parseSdk(
      "https://example.com/ee/v1/interact",
      JSON.stringify({
        events: [{ xdm: { __adobe: { analytics: { pageName: "from-xdm" } } } }]
      })
    );
    expect(hit.events[0]?.analytics).toEqual({ pageName: "from-xdm" });
  });
});
