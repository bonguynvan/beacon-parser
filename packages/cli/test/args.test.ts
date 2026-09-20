import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/args.js";

describe("parseArgs", () => {
  it("parses --config", () => {
    expect(parseArgs(["--config", "beacon.config.mjs"]).config).toBe("beacon.config.mjs");
  });

  it("parses the -c short flag", () => {
    expect(parseArgs(["-c", "beacon.config.mjs"]).config).toBe("beacon.config.mjs");
  });

  it("collects repeated --flow flags", () => {
    const options = parseArgs(["--flow", "checkout", "--flow", "add to cart"]);
    expect(options.flows).toEqual(["checkout", "add to cart"]);
  });

  it("parses --report", () => {
    expect(parseArgs(["--report", "out.html"]).report).toBe("out.html");
  });

  it("parses --help", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
  });

  it("defaults flows to an empty array and help to false", () => {
    const options = parseArgs(["--config", "x.mjs"]);
    expect(options.flows).toEqual([]);
    expect(options.help).toBe(false);
  });

  it("throws on an unknown argument", () => {
    expect(() => parseArgs(["--bogus"])).toThrow('Unknown argument: --bogus');
  });

  it("throws when a flag is missing its value", () => {
    expect(() => parseArgs(["--config"])).toThrow("Missing value for --config");
  });
});
