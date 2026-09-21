import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runFlows } from "../src/run-flows.js";
import type { BeaconConfig } from "../src/types.js";

// Real Chromium against a local server that counts the Adobe-shaped requests
// that actually arrive. Whether an aborted request is still *captured* is the
// point of the blockHits option, so it's tested against a real browser rather
// than assumed.
const PAGE = `<!doctype html><script>
  fetch("/b/ss/examplecompanyprod/1/H29-abc123?pageName=home&events=event1", { mode: "no-cors" }).catch(() => {});
</script>`;

let server: Server;
let baseURL: string;
let hitsReceived = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url?.startsWith("/b/ss/")) {
      hitsReceived += 1;
      res.writeHead(204).end();
      return;
    }
    res.writeHead(200, { "content-type": "text/html" }).end(PAGE);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  hitsReceived = 0;
});

function config(): BeaconConfig {
  return {
    baseURL,
    plan: {
      name: "home",
      events: [{ name: "home view", match: (hit) => hit.kind === "appmeasurement", events: ["event1"] }]
    },
    flows: { home: async (page) => void (await page.goto("/")) }
  };
}

describe("runFlows", () => {
  it("captures the hit and lets it through by default", async () => {
    const [result] = await runFlows(config(), ["home"]);

    expect(result?.hits).toHaveLength(1);
    expect(result?.result.passed).toBe(true);
    expect(hitsReceived).toBe(1);
  }, 30_000);

  it("with blockHits, still captures and validates the hit but it never reaches the server", async () => {
    const [result] = await runFlows(config(), ["home"], { blockHits: true });

    expect(result?.hits).toHaveLength(1);
    expect(result?.hits[0]?.kind).toBe("appmeasurement");
    expect(result?.result.passed).toBe(true);
    expect(hitsReceived).toBe(0);
  }, 30_000);
});
