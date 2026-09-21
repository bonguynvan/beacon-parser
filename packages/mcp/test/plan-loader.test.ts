import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadPlan } from "../src/plan-loader.js";

const PLAN = `export default { name: "checkout", events: [{ name: "purchase", match: (hit) => hit.kind === "appmeasurement" }] };`;

let base: string;
let root: string;

beforeEach(async () => {
  base = await mkdtemp(path.join(tmpdir(), "beacon-mcp-plan-"));
  root = path.join(base, "root");
  await mkdir(root);
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

describe("loadPlan", () => {
  it("loads a plan module inside the root", async () => {
    await writeFile(path.join(root, "plan.mjs"), PLAN);
    const plan = await loadPlan("plan.mjs", root);
    expect(plan.name).toBe("checkout");
    expect(typeof plan.events[0]?.match).toBe("function");
  });

  it("rejects a path that climbs out of the root", async () => {
    await writeFile(path.join(base, "outside.mjs"), PLAN);
    await expect(loadPlan("../outside.mjs", root)).rejects.toThrow(/must be inside/);
  });

  it("rejects an absolute path outside the root", async () => {
    const outside = path.join(base, "outside.mjs");
    await writeFile(outside, PLAN);
    await expect(loadPlan(outside, root)).rejects.toThrow(/must be inside/);
  });

  it("rejects a symlink inside the root that points outside it", async () => {
    const outside = path.join(base, "outside.mjs");
    await writeFile(outside, PLAN);
    try {
      await symlink(outside, path.join(root, "link.mjs"));
    } catch {
      return; // symlink creation needs privileges on some Windows setups
    }
    await expect(loadPlan("link.mjs", root)).rejects.toThrow(/must be inside/);
  });

  it("rejects non-JS extensions without touching the file", async () => {
    await writeFile(path.join(root, "plan.json"), "{}");
    await expect(loadPlan("plan.json", root)).rejects.toThrow(/\.mjs or \.js/);
  });

  it("reports a missing file clearly", async () => {
    await expect(loadPlan("nope.mjs", root)).rejects.toThrow(/was not found/);
  });

  it("rejects a module that doesn't default-export a plan", async () => {
    await writeFile(path.join(root, "bad.mjs"), `export default { name: "x", events: [{ name: "e" }] };`);
    await expect(loadPlan("bad.mjs", root)).rejects.toThrow(/default-export a tracking plan/);
  });
});
