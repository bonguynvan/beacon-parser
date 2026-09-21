import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  diffHitsFields,
  diffHitsTool,
  explainHitTool,
  hitFields,
  parseHitTool,
  validateHitsFields,
  validateHitsTool
} from "./tools.js";

const PRIVACY =
  " Only pass synthetic or anonymized hits -- never a hit captured from a real, logged-in browsing session.";

export interface ServerOptions {
  /** Directory tracking-plan files must live inside. */
  root: string;
  version: string;
}

export function createServer({ root, version }: ServerOptions): McpServer {
  const server = new McpServer({ name: "beacon-mcp", version });

  server.registerTool(
    "parse_hit",
    {
      title: "Decode an Adobe Analytics hit",
      description:
        "Decode one AppMeasurement or Web SDK (Alloy) network hit into typed JSON: page name, events, eVars, props, link tracking, context data. Unrecognized input returns kind \"unknown\" instead of failing. Runs locally; nothing is sent anywhere." +
        PRIVACY,
      inputSchema: hitFields,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    (args) => parseHitTool(args)
  );

  server.registerTool(
    "explain_hit",
    {
      title: "Explain an Adobe Analytics hit, with sources",
      description:
        "Decode a hit and explain each field in plain language, with the Adobe Experience League page each meaning was verified against, plus an explicit list of what the wire cannot tell you (e.g. what an eVar slot means is a report-suite setting). Prefer this over guessing what a parameter means. Deterministic; no LLM involved." +
        PRIVACY,
      inputSchema: hitFields,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    (args) => explainHitTool(args)
  );

  server.registerTool(
    "diff_hits",
    {
      title: "Diff two sets of hits (migration parity)",
      description:
        "Compare hits captured from an old and a new implementation of the same user flow (e.g. a tag-manager or AppMeasurement -> Web SDK migration) and report missing/added events, changed eVar/prop values, and missing/added hits. Matching is by pageName then position: best-effort, not exact. Web SDK eVars set via XDM/contextData are mapped server-side and cannot be compared." +
        PRIVACY,
      inputSchema: diffHitsFields,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false }
    },
    (args) => diffHitsTool(args)
  );

  server.registerTool(
    "validate_hits",
    {
      title: "Validate hits against a tracking plan",
      description:
        "Validate hits captured from one flow against a tracking plan file (built with @bonv/tracking-plan's definePlan). Returns pass/fail with a structured reason per problem: missing-hit, missing-field, unexpected-value, unmatched-hit. The plan file is executed as code, so it must live inside the server's root directory." +
        PRIVACY,
      inputSchema: validateHitsFields,
      annotations: { idempotentHint: true, openWorldHint: false }
    },
    (args) => validateHitsTool(args, root)
  );

  return server;
}
