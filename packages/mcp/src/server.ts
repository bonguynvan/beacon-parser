import path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import pkg from "../package.json" with { type: "json" };
import { createServer } from "./create-server.js";

const USAGE = `Usage: beacon-mcp [--root <dir>]

Runs an MCP server over stdio. Tools: parse_hit, explain_hit, diff_hits, validate_hits.

  --root <dir>   Directory tracking-plan files must live inside. Default: the current directory.
  --help, -h     Show this message
`;

function parseRoot(args: string[]): string {
  const index = args.indexOf("--root");
  if (index === -1) return process.cwd();

  const value = args[index + 1];
  if (!value) throw new Error("Missing value for --root");
  return path.resolve(value);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    // stdout is the protocol channel when serving; --help exits before that starts.
    process.stdout.write(USAGE);
    return;
  }

  const server = createServer({ root: parseRoot(args), version: pkg.version });
  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  // stderr only: stdout carries the JSON-RPC stream.
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
