import { describe, expect, it } from "vitest";
import { parseHit } from "../src/index.js";
import type { HitInput } from "../src/types.js";

const RANDOM_ITERATIONS = 500;
const SEED_CORPUS = [
  "",
  "not a url",
  "https://example.com",
  "https://example.com/b/ss",
  "https://example.com/b/ss/rsid",
  "https://example.com/b/ss/rsid/1",
  "https://example.com/b/ss/rsid/1/code",
  "https://example.com/ee",
  "https://example.com/ee/v1/interact",
  "https://example.com/ee/v1/collect?configId=",
  "ftp://weird-scheme/b/ss/rsid/1/code",
  "https://example.com/b/ss/rsid/1/code?" + "a".repeat(5000) + "=1",
  "https://example.com/b/ss/rsid/1/code?c.=1&c..=2&c.a.=3",
  "https://example.com/b/ss/rsid/1/code?v999999999999999999999999999=x",
  "https://example.com/b/ss/rsid/1/code?products=;;;;;,,,;;;",
  "https://example.com/b/ss/rsid/1/code?events=,,,=,==,"
];

function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/?&=.,:;%{}[]\"'\\\n\t ";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function randomHitInput(): HitInput {
  const url = randomString(Math.floor(Math.random() * 200));
  const method = Math.random() > 0.5 ? "POST" : "GET";
  const body = Math.random() > 0.5 ? randomString(Math.floor(Math.random() * 200)) : undefined;
  return body === undefined ? { url, method } : { url, method, body };
}

describe("parseHit never throws", () => {
  for (const url of SEED_CORPUS) {
    it(`does not throw for seed: ${JSON.stringify(url).slice(0, 60)}`, () => {
      expect(() => parseHit({ url })).not.toThrow();
      expect(() => parseHit({ url, method: "POST", body: "a=1&b=2" })).not.toThrow();
    });
  }

  it(`does not throw across ${RANDOM_ITERATIONS} random inputs`, () => {
    for (let i = 0; i < RANDOM_ITERATIONS; i++) {
      const input = randomHitInput();
      expect(() => parseHit(input)).not.toThrow();
    }
  });

  it("does not throw for non-string/malformed fields", () => {
    const malformed = [
      { url: undefined as unknown as string },
      { url: null as unknown as string },
      { url: 123 as unknown as string },
      { url: "https://example.com/b/ss/rsid/1/code", body: 123 as unknown as string },
      { url: "https://example.com/ee/v1/interact", body: "{not valid json" },
      { url: "https://example.com/ee/v1/interact", body: "null" },
      { url: "https://example.com/ee/v1/interact", body: "[1,2,3]" },
      { url: "https://example.com/ee/v1/interact", body: '{"events": "not-an-array"}' }
    ];

    for (const input of malformed) {
      expect(() => parseHit(input as HitInput)).not.toThrow();
    }
  });

  it("always returns a value with a valid kind", () => {
    for (const url of SEED_CORPUS) {
      const result = parseHit({ url });
      expect(["appmeasurement", "websdk", "unknown"]).toContain(result.kind);
    }
  });
});
