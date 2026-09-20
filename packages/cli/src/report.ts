import { writeFile } from "node:fs/promises";
import type { FlowResult } from "./run-flows.js";

/** Writes a self-contained, static HTML summary of a run -- readable by a non-technical stakeholder from a link, no server involved. */
export async function writeReport(reportPath: string, results: FlowResult[]): Promise<void> {
  await writeFile(reportPath, renderReport(results), "utf-8");
}

function renderReport(results: FlowResult[]): string {
  const allPassed = results.every((entry) => entry.result.passed);
  const flows = results.map(renderFlow).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>beacon-qa report</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0b0d10; color: #e6e8eb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
  h1 { font-size: 1.3rem; margin: 0 0 0.5rem; }
  .summary { font-family: ui-monospace, "SF Mono", Consolas, monospace; font-size: 0.85rem; color: ${allPassed ? "#7ee787" : "#ff8a8a"}; margin: 0 0 2rem; }
  .flow { border: 1px solid #22262d; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1rem; background: #12151a; }
  .flow h2 { font-size: 1rem; margin: 0; display: flex; align-items: center; gap: 0.6rem; }
  .badge { font-family: ui-monospace, monospace; font-size: 0.75rem; padding: 0.15rem 0.55rem; border-radius: 999px; }
  .badge.pass { color: #7ee787; border: 1px solid #3d6b42; }
  .badge.fail { color: #ff8a8a; border: 1px solid #7a3a3a; }
  ul { margin: 0.6rem 0 0; padding-left: 1.2rem; color: #8b93a1; font-size: 0.85rem; }
  li { margin-bottom: 0.3rem; }
  footer { margin-top: 2rem; color: #5b6472; font-size: 0.75rem; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>beacon-qa report</h1>
    <p class="summary">${allPassed ? "All flows passed" : "One or more flows failed"} -- generated ${new Date().toISOString()}</p>
    ${flows}
    <footer>Client-side only: this checks what a browser sent, not what appears in an Adobe report.</footer>
  </div>
</body>
</html>
`;
}

function renderFlow({ name, result }: FlowResult): string {
  const badgeClass = result.passed ? "pass" : "fail";
  const badgeText = result.passed ? "PASS" : "FAIL";
  const issues = result.issues
    .map((issue) => `<li>[${escapeHtml(issue.kind)}] ${escapeHtml(issue.message)}</li>`)
    .join("");

  return `<div class="flow">
    <h2>${escapeHtml(name)} <span class="badge ${badgeClass}">${badgeText}</span></h2>
    ${issues ? `<ul>${issues}</ul>` : ""}
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
