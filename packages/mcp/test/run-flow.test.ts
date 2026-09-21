import { createServer as createHttpServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../src/create-server.js";

// Real Chromium + a local server counting the Adobe-shaped requests that
// actually arrive, driven through a real MCP client.
const PAGE = `<!doctype html><script>
  fetch("/b/ss/examplecompanyprod/1/H29-abc123?pageName=home&events=event1", { mode: "no-cors" }).catch(() => {});
</script>`;

let site: Server;
let baseURL: string;
let hitsReceived = 0;

let root: string;
let client: Client;

async function writeConfig(file: string, expectedEvent: string): Promise<void> {
  await writeFile(
    path.join(root, file),
    `export default {
      baseURL: ${JSON.stringify(baseURL)},
      plan: { name: "home", events: [{ name: "home view", match: (h) => h.kind === "appmeasurement", events: [${JSON.stringify(expectedEvent)}] }] },
      flows: { home: async (page) => { await page.goto("/"); }, other: async (page) => { await page.goto("/"); } }
    };`
  );
}

async function call(args: Record<string, unknown>) {
  const result = await client.callTool({ name: "run_flow", arguments: args });
  const first = (result.content as Array<{ text: string }>)[0];
  return { isError: result.isError === true, text: first?.text ?? "" };
}

beforeAll(async () => {
  site = createHttpServer((req, res) => {
    if (req.url?.startsWith("/b/ss/")) {
      hitsReceived += 1;
      res.writeHead(204).end();
      return;
    }
    res.writeHead(200, { "content-type": "text/html" }).end(PAGE);
  });
  await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${(site.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => site.close(() => resolve()));
});

beforeEach(async () => {
  hitsReceived = 0;
  root = await mkdtemp(path.join(tmpdir(), "beacon-mcp-flow-"));
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer({ root, version: "0.0.0-test" }).connect(serverTransport);
  client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
  await rm(root, { recursive: true, force: true });
});

describe("run_flow", () => {
  it("captures and validates the hit but blocks it by default", async () => {
    await writeConfig("beacon.config.mjs", "event1");

    const { isError, text } = await call({ configFile: "beacon.config.mjs", flows: ["home"] });
    expect(isError).toBe(false);

    const result = JSON.parse(text);
    expect(result.passed).toBe(true);
    expect(result.hitsBlocked).toBe(true);
    expect(result.flows).toHaveLength(1);
    expect(result.flows[0].hitCount).toBe(1);
    expect(result.flows[0].hits[0].kind).toBe("appmeasurement");
    expect(hitsReceived).toBe(0);
  }, 30_000);

  it("lets hits through only when sendHits is set", async () => {
    await writeConfig("beacon.config.mjs", "event1");

    const { text } = await call({ configFile: "beacon.config.mjs", flows: ["home"], sendHits: true });
    expect(JSON.parse(text).hitsBlocked).toBe(false);
    expect(hitsReceived).toBe(1);
  }, 30_000);

  it("runs every flow when none are named", async () => {
    await writeConfig("beacon.config.mjs", "event1");

    const { text } = await call({ configFile: "beacon.config.mjs" });
    expect(JSON.parse(text).flows.map((f: { name: string }) => f.name)).toEqual(["home", "other"]);
  }, 30_000);

  it("reports a failing plan with structured issues", async () => {
    await writeConfig("beacon.config.mjs", "event9");

    const { isError, text } = await call({ configFile: "beacon.config.mjs", flows: ["home"] });
    expect(isError).toBe(false);

    const result = JSON.parse(text);
    expect(result.passed).toBe(false);
    expect(result.flows[0].issues[0].kind).toBe("missing-field");
  }, 30_000);

  it("rejects an unknown flow name, listing the available ones, without launching a browser", async () => {
    await writeConfig("beacon.config.mjs", "event1");

    const { isError, text } = await call({ configFile: "beacon.config.mjs", flows: ["nope"] });
    expect(isError).toBe(true);
    expect(text).toContain("Unknown flow(s): nope");
    expect(text).toContain("home, other");
  });

  it("refuses a config outside the root", async () => {
    const { isError, text } = await call({ configFile: "../elsewhere.mjs" });
    expect(isError).toBe(true);
    expect(text).toMatch(/configFile must be inside|not found/);
  });

  it("refuses a config that isn't a .mjs/.js file", async () => {
    await writeFile(path.join(root, "beacon.config.json"), "{}");
    const { isError, text } = await call({ configFile: "beacon.config.json" });
    expect(isError).toBe(true);
    expect(text).toMatch(/must be a \.mjs or \.js file/);
  });
});
