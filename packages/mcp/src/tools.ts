import { diffAdobeHits, parseHit, type AdobeHit, type HitInput } from "@bonv/beacon-parser";
import { validate } from "@bonv/tracking-plan";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { explainHit } from "./explain.js";
import { loadPlan } from "./plan-loader.js";

const MAX_HITS = 200;

export const hitFields = {
  url: z.string().min(1).max(20_000).describe("Full request URL of the hit, as seen in the browser's network tab."),
  method: z.enum(["GET", "POST"]).optional().describe("HTTP method. Defaults to GET."),
  body: z.string().max(500_000).optional().describe("Request body for POST hits: a form-encoded string (AppMeasurement) or a JSON string (Web SDK).")
};

const hitSchema = z.object(hitFields);
const hitList = z.array(hitSchema).min(1).max(MAX_HITS);

export const diffHitsFields = {
  before: hitList.describe("Hits captured from the old implementation, in the order they fired."),
  after: hitList.describe("Hits captured from the new implementation running the same user flow.")
};

export const validateHitsFields = {
  hits: hitList.describe("Hits captured from one user flow."),
  planFile: z.string().min(1).describe("Path to a tracking plan module (.mjs/.js) that default-exports definePlan({...}), relative to the server's root directory."),
  strict: z.boolean().optional().describe("Also report captured hits that match no event in the plan.")
};

function ok(value: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

/** Parses every input; hits that aren't AppMeasurement/Web SDK are reported, not silently dropped. */
function parseAll(inputs: HitInput[]): { hits: AdobeHit[]; skipped: Array<{ index: number; reason: string }> } {
  const hits: AdobeHit[] = [];
  const skipped: Array<{ index: number; reason: string }> = [];

  inputs.forEach((input, index) => {
    const parsed = parseHit(input);
    if (parsed.kind === "unknown") {
      skipped.push({ index, reason: parsed.reason });
    } else {
      hits.push(parsed);
    }
  });

  return { hits, skipped };
}

export function parseHitTool(input: HitInput): CallToolResult {
  return ok(parseHit(input));
}

export function explainHitTool(input: HitInput): CallToolResult {
  return ok(explainHit(parseHit(input)));
}

export function diffHitsTool(args: { before: HitInput[]; after: HitInput[] }): CallToolResult {
  const before = parseAll(args.before);
  const after = parseAll(args.after);

  return ok({
    ...diffAdobeHits(before.hits, after.hits),
    skipped: { before: before.skipped, after: after.skipped }
  });
}

export async function validateHitsTool(
  args: { hits: HitInput[]; planFile: string; strict?: boolean },
  root: string
): Promise<CallToolResult> {
  let plan;
  try {
    plan = await loadPlan(args.planFile, root);
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  const { hits, skipped } = parseAll(args.hits);
  const result = validate(hits, plan, args.strict ? { strict: true } : {});
  return ok({ plan: plan.name, ...result, skipped });
}
