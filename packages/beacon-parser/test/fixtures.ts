import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { HitInput } from "../src/types.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(HERE, "../../../fixtures");

export interface FixtureCase {
  name: string;
  dir: string;
  input: HitInput;
  expected: unknown;
}

interface RawFixtureInput {
  url: string;
  method?: "GET" | "POST";
  body?: string;
  /** Convenience for Web SDK fixtures: a JSON object serialized into `body`. */
  bodyJson?: unknown;
}

export function loadFixtures(group: "appmeasurement" | "websdk"): FixtureCase[] {
  const groupDir = path.join(FIXTURES_ROOT, group);
  const entries = readdirSync(groupDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return entries.map((name) => {
    const dir = path.join(groupDir, name);
    const raw: RawFixtureInput = JSON.parse(readFileSync(path.join(dir, "input.json"), "utf-8"));
    const expected: unknown = JSON.parse(readFileSync(path.join(dir, "expected.json"), "utf-8"));

    const input: HitInput = {
      url: raw.url,
      ...(raw.method ? { method: raw.method } : {}),
      ...(raw.body !== undefined
        ? { body: raw.body }
        : raw.bodyJson !== undefined
          ? { body: JSON.stringify(raw.bodyJson) }
          : {})
    };

    return { name, dir, input, expected };
  });
}
