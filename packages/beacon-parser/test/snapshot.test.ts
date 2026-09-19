import { describe, expect, it } from "vitest";
import { parseHit } from "../src/index.js";
import { loadFixtures } from "./fixtures.js";

describe("fixtures/appmeasurement", () => {
  for (const fixture of loadFixtures("appmeasurement")) {
    it(`parses ${fixture.name}`, () => {
      const result = parseHit(fixture.input);
      expect(result).toEqual(fixture.expected);
    });
  }
});

describe("fixtures/websdk", () => {
  for (const fixture of loadFixtures("websdk")) {
    it(`parses ${fixture.name}`, () => {
      const result = parseHit(fixture.input);
      expect(result).toEqual(fixture.expected);
    });
  }
});
