import { realpath } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { TrackingPlan } from "@bonv/tracking-plan";

const ALLOWED_EXTENSIONS = new Set([".mjs", ".js"]);

/**
 * Resolves a file the calling agent named to an absolute path, refusing
 * anything that isn't a .mjs/.js file inside `root` (symlinks followed).
 *
 * Tracking plans and flow configs are code -- loading one executes a local
 * file the agent chose -- so this is what keeps a tool call from being an
 * arbitrary-file-execution primitive. `label` names the argument in errors.
 */
export async function resolveInsideRoot(file: string, root: string, label = "planFile"): Promise<string> {
  if (!ALLOWED_EXTENSIONS.has(path.extname(file))) {
    throw new Error(`${label} must be a .mjs or .js file, got "${file}"`);
  }

  const realRoot = await realpath(root);
  let resolved: string;
  try {
    resolved = await realpath(path.resolve(realRoot, file));
  } catch {
    throw new Error(`${label} "${file}" was not found under ${realRoot}`);
  }

  const relative = path.relative(realRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be inside ${realRoot} (restart the server with --root to change this)`);
  }

  return resolved;
}

/** Loads a tracking plan module (default export, built with definePlan()). */
export async function loadPlan(planFile: string, root: string): Promise<TrackingPlan> {
  const resolved = await resolveInsideRoot(planFile, root);
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
