import { parseArgs, USAGE } from "./args.js";
import { loadConfig } from "./load-config.js";
import { runFlows, type FlowResult } from "./run-flows.js";
import { writeReport } from "./report.js";

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || !options.config) {
    console.log(USAGE);
    process.exit(options.help ? 0 : 1);
  }

  const config = await loadConfig(options.config);
  const flowNames = options.flows.length > 0 ? options.flows : Object.keys(config.flows);

  for (const name of flowNames) {
    if (!config.flows[name]) {
      throw new Error(`Unknown flow "${name}". Available flows: ${Object.keys(config.flows).join(", ")}`);
    }
  }

  const results = await runFlows(config, flowNames);
  const allPassed = printResults(results);

  if (options.report) {
    await writeReport(options.report, results);
    console.log(`\nReport written to ${options.report}`);
  }

  process.exit(allPassed ? 0 : 1);
}

function printResults(results: FlowResult[]): boolean {
  let allPassed = true;

  for (const { name, result } of results) {
    console.log(`\n${result.passed ? "PASS" : "FAIL"}  ${name}`);
    for (const issue of result.issues) {
      console.log(`  - [${issue.kind}] ${issue.message}`);
    }
    if (!result.passed) allPassed = false;
  }

  return allPassed;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
