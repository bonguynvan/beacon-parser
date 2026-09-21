import { realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { TrackingPlan } from "@bonv/tracking-plan";

const ALLOWED_EXTENSIONS = new Set([".mjs", ".js"]);

/**
 * Loads a tracking plan module (default export, built with definePlan()).
 *
 * A plan contains `match` functions, so loading one executes a local file the
 * calling agent named. To keep that from being an arbitrary-file-execution
 * primitive, the path must resolve (symlinks followed) to a .mjs/.js file
 * inside `root`, which the user sets when starting the server.
 */
export async function loadPlan(planFile: string, root: string): Promise<TrackingPlan> {
  if (!ALLOWED_EXTENSIONS.has(path.extname(planFile))) {
    throw new Error(`planFile must be a .mjs or .js file, got "${planFile}"`);
  }

  const realRoot = await realpath(root);
  let resolved: string;
  try {
    resolved = await realpath(path.resolve(realRoot, planFile));
  } catch {
    throw new Error(`planFile "${planFile}" was not found under ${realRoot}`);
  }

  const relative = path.relative(realRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`planFile must be inside ${realRoot} (restart the server with --root to change this)`);
  }

  const mod: unknown = await import(pathToFileURL(resolved).href);
  return assertPlan((mod as { default?: unknown }).default, planFile);
}

function assertPlan(value: unknown, planFile: string): TrackingPlan {
  const plan = value as Partial<TrackingPlan> | null;
  const valid =
    typeof plan === "object" &&
    plan !== null &&
    typeof plan.name === "string" &&
    Array.isArray(plan.events) &&
    plan.events.every((event) => typeof event?.name === "string" && typeof event?.match === "function");

  if (!valid) {
    throw new Error(`${planFile} must default-export a tracking plan: definePlan({ name, events: [{ name, match, ... }] })`);
  }
  return plan as TrackingPlan;
}
