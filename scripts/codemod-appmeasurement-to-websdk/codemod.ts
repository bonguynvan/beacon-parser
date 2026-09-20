/**
 * Dev-only codemod. NOT part of any published package.
 *
 * Scans a JS/TS file for AppMeasurement `s.tl()` (link tracking) and `s.t()`
 * (page view) call sites, collects the `s.propN`/`s.eVarN`/`s.pageName`/
 * `s.events`/`s.contextData[...]` assignments made earlier in the same
 * block, and inserts a draft Web SDK equivalent as a comment directly above
 * each call site. The original file is never modified -- output always
 * goes to a separate `*.websdk-draft.*` file.
 *
 * This is a starting point for a human to adapt, not an automated
 * migration: numbered eVars/props have no universal Web SDK mapping (that
 * mapping is server-side, per datastream config), so every generated field
 * carries a TODO rather than a guessed XDM path. See README.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

// @babel/traverse is CJS; its ESM default export is wrapped an extra level
// depending on the interop, so fall back to the namespace's own "default".
const traverse = (typeof _traverse === "function" ? _traverse : (_traverse as { default: typeof _traverse }).default) as typeof _traverse;

interface HitSite {
  kind: "pageview" | "link";
  /** 1-based source line the s.t()/s.tl() call starts on. */
  line: number;
  pageName?: string;
  events: string[];
  props: Record<string, string>;
  eVars: Record<string, string>;
  contextData: Record<string, string>;
}

const USAGE = `Usage: pnpm codemod <file> [--var s] [--out path]

  <file>   JS/TS file to scan for AppMeasurement call sites
  --var    Variable name the AppMeasurement tracker is assigned to. Default: s
  --out    Output path for the draft file. Default: <file> with ".websdk-draft" inserted before the extension
`;

function findHitSites(source: string, filePath: string, trackerVar: string): HitSite[] {
  const isTypeScript = /\.tsx?$/.test(filePath);
  const ast = parse(source, {
    sourceType: "unambiguous",
    plugins: isTypeScript ? ["typescript"] : []
  });

  const sites: HitSite[] = [];

  traverse(ast, {
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;
      if (!t.isMemberExpression(callee)) return;
      if (!t.isIdentifier(callee.object, { name: trackerVar })) return;
      if (!t.isIdentifier(callee.property)) return;

      const method = callee.property.name;
      if (method !== "t" && method !== "tl") return;

      const line = nodePath.node.loc?.start.line;
      if (line === undefined) return;

      const statementPath = nodePath.getStatementParent();
      const block = statementPath?.container;
      if (!statementPath || !Array.isArray(block)) return;

      const index = block.indexOf(statementPath.node as t.Statement);
      const preceding = block.slice(0, index) as t.Statement[];

      sites.push({
        kind: method === "tl" ? "link" : "pageview",
        line,
        ...collectAssignments(preceding, trackerVar)
      });
    }
  });

  return sites.sort((a, b) => a.line - b.line);
}

function collectAssignments(
  statements: t.Statement[],
  trackerVar: string
): Pick<HitSite, "pageName" | "events" | "props" | "eVars" | "contextData"> {
  const props: Record<string, string> = {};
  const eVars: Record<string, string> = {};
  const contextData: Record<string, string> = {};
  let pageName: string | undefined;
  let events: string[] = [];

  for (const statement of statements) {
    if (!t.isExpressionStatement(statement)) continue;
    const expr = statement.expression;
    if (!t.isAssignmentExpression(expr) || expr.operator !== "=") continue;
    if (!t.isMemberExpression(expr.left)) continue;

    const value = literalValueOf(expr.right);
    if (value === undefined) continue;

    // s.contextData["key"] = value  /  s.contextData.key = value
    if (
      t.isMemberExpression(expr.left.object) &&
      t.isIdentifier(expr.left.object.object, { name: trackerVar }) &&
      t.isIdentifier(expr.left.object.property, { name: "contextData" })
    ) {
      const key = propertyKeyOf(expr.left);
      if (key) contextData[key] = value;
      continue;
    }

    if (!t.isIdentifier(expr.left.object, { name: trackerVar })) continue;
    const propName = propertyKeyOf(expr.left);
    if (!propName) continue;

    const propMatch = /^prop(\d+)$/.exec(propName);
    const evarMatch = /^eVar(\d+)$/.exec(propName);

    if (propMatch) {
      props[propMatch[1]!] = value;
    } else if (evarMatch) {
      eVars[evarMatch[1]!] = value;
    } else if (propName === "pageName") {
      pageName = value;
    } else if (propName === "events") {
      events = value.split(",").map((id) => id.trim()).filter(Boolean);
    }
  }

  return { pageName, events, props, eVars, contextData };
}

function propertyKeyOf(member: t.MemberExpression): string | undefined {
  if (!member.computed && t.isIdentifier(member.property)) return member.property.name;
  if (member.computed && t.isStringLiteral(member.property)) return member.property.value;
  return undefined;
}

/** Only resolves statically-known literal values -- anything computed at runtime is intentionally left out rather than guessed. */
function literalValueOf(node: t.Expression): string | undefined {
  if (t.isStringLiteral(node)) return node.value;
  if (t.isNumericLiteral(node)) return String(node.value);
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? "").join("");
  }
  return undefined;
}

function renderDraftComment(site: HitSite): string {
  const eventType = site.kind === "link" ? "web.webinteraction.linkClicks" : "web.webpagedetails.pageViews";
  const contextEntries: Array<[string, string]> = [
    ...Object.entries(site.props).map(([n, v]) => [`prop${n}`, v] as [string, string]),
    ...Object.entries(site.eVars).map(([n, v]) => [`eVar${n}`, v] as [string, string]),
    ...Object.entries(site.contextData)
  ];

  const body: string[] = [
    "---- Web SDK draft (auto-generated -- verify before using) ----",
    "Numbered eVars/props have NO universal Web SDK mapping (that mapping is",
    "server-side, per datastream config) -- confirm every field below against",
    "this datastream's real XDM configuration. Starting point, not a finished",
    "migration.",
    "",
    'alloy("sendEvent", {',
    `  xdm: { eventType: "${eventType}" }, // TODO: verify eventType`,
    "  data: {",
    "    __adobe: {",
    "      analytics: {"
  ];

  if (site.pageName) body.push(`        pageName: ${JSON.stringify(site.pageName)},`);
  if (site.events.length) body.push(`        events: ${JSON.stringify(site.events)},`);

  if (contextEntries.length) {
    body.push("        contextData: {");
    for (const [key, value] of contextEntries) {
      body.push(`          ${JSON.stringify(key)}: ${JSON.stringify(value)}, // TODO: rename to this datastream's real XDM field for ${key}`);
    }
    body.push("        }");
  }

  body.push("      }", "    }", "  }", "});");
  body.push("----------------------------------------------------------------");

  return `/* ${body.join("\n * ")} */`;
}

function insertDrafts(source: string, sites: HitSite[]): string {
  const lines = source.split("\n");

  // Insert from the bottom up so earlier line numbers stay valid as we go.
  for (const site of [...sites].sort((a, b) => b.line - a.line)) {
    const comment = renderDraftComment(site);
    const indent = /^\s*/.exec(lines[site.line - 1] ?? "")?.[0] ?? "";
    const commentLines = comment.split("\n").map((line) => indent + line);
    lines.splice(site.line - 1, 0, ...commentLines);
  }

  return lines.join("\n");
}

function defaultOutPath(filePath: string): string {
  const ext = path.extname(filePath);
  const base = filePath.slice(0, -ext.length || undefined);
  return `${base}.websdk-draft${ext}`;
}

interface Args {
  filePath?: string;
  trackerVar: string;
  outPath?: string;
  help: boolean;
}

function parseArgs(args: string[]): Args {
  const result: Args = { trackerVar: "s", help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;

    if (arg === "--var") {
      result.trackerVar = args[++i] ?? result.trackerVar;
    } else if (arg === "--out") {
      result.outPath = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (!arg.startsWith("--") && !result.filePath) {
      result.filePath = arg;
    }
  }

  return result;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.filePath) {
    console.log(USAGE);
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const filePath = args.filePath;
  const trackerVar = args.trackerVar;
  const outPath = args.outPath ?? defaultOutPath(filePath);

  const source = readFileSync(filePath, "utf-8");
  const sites = findHitSites(source, filePath, trackerVar);

  if (sites.length === 0) {
    console.log(`No ${trackerVar}.t()/${trackerVar}.tl() call sites found in ${filePath}.`);
    return;
  }

  writeFileSync(outPath, insertDrafts(source, sites), "utf-8");

  console.log(`Found ${sites.length} hit site(s). Draft written to ${outPath} -- original file untouched.`);
  console.log("Every numbered eVar/prop/event needs manual verification against your datastream config.");
}

main();
