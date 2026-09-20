import path from "node:path";
import { pathToFileURL } from "node:url";
import type { BeaconConfig } from "./types.js";

/** Loads a beacon.config.mjs (or .js) file's default export and validates its shape. */
export async function loadConfig(configPath: string): Promise<BeaconConfig> {
  const absolute = path.resolve(process.cwd(), configPath);
  const mod: unknown = await import(pathToFileURL(absolute).href);
  const config = (mod as { default?: unknown }).default;

  if (!config || typeof config !== "object") {
    throw new Error(`Config at ${configPath} must have a default export`);
  }

  const candidate = config as Partial<BeaconConfig>;
  if (!candidate.plan) {
    throw new Error(`Config at ${configPath} is missing "plan"`);
  }
  if (!candidate.flows || Object.keys(candidate.flows).length === 0) {
    throw new Error(`Config at ${configPath} is missing "flows" (needs at least one)`);
  }

  return candidate as BeaconConfig;
}
