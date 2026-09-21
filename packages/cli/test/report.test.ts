import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeReport } from "../src/report.js";
import type { FlowResult } from "../src/run-flows.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "beacon-cli-report-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("writeReport", () => {
  it("writes a PASS badge and no issue list for a passing flow", async () => {
    const results: FlowResult[] = [{ name: "checkout", result: { passed: true, issues: [], unmatchedHits: [] }, hits: [] }];
    const file = path.join(dir, "report.html");

    await writeReport(file, results);
    const html = await readFile(file, "utf-8");

    expect(html).toContain("checkout");
    expect(html).toContain('class="badge pass">PASS');
    expect(html).toContain("All flows passed");
  });

  it("writes a FAIL badge and the issue list for a failing flow", async () => {
    const results: FlowResult[] = [
      {
        name: "checkout",
        result: {
          passed: false,
          issues: [{ eventName: "purchase", kind: "missing-hit", message: '"purchase": expected at least one matching hit, but none fired' }],
          unmatchedHits: []
        },
        hits: []
      }
    ];
    const file = path.join(dir, "report.html");

    await writeReport(file, results);
    const html = await readFile(file, "utf-8");

    expect(html).toContain('class="badge fail">FAIL');
    expect(html).toContain("expected at least one matching hit");
    expect(html).toContain("One or more flows failed");
  });

  it("escapes HTML in flow names and issue messages", async () => {
    const results: FlowResult[] = [
      {
        name: "<script>alert(1)</script>",
        result: { passed: false, issues: [{ eventName: "x", kind: "missing-hit", message: "<b>bold</b>" }], unmatchedHits: [] },
        hits: []
      }
    ];
    const file = path.join(dir, "report.html");

    await writeReport(file, results);
    const html = await readFile(file, "utf-8");

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });
});
