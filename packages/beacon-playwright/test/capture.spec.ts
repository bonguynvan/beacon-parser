import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureAdobeHits } from "../src/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ page }) => {
  // The fixtures fire at fake, unroutable hosts. Short-circuit them so the
  // test doesn't wait on real DNS/network behavior in any environment --
  // we only care that the browser attempted the request, not what (if
  // anything) answers it.
  await page.route("https://fake-*/**", (route) => route.fulfill({ status: 204, body: "" }));
});

test("captures an AppMeasurement hit fired by a click", async ({ page }) => {
  await page.goto(`file://${path.join(here, "fixtures/appmeasurement.html")}`);

  const hits = await captureAdobeHits(page, () => page.click("#buy"));

  expect(hits).toHaveLength(1);
  const hit = hits[0];
  expect(hit?.kind).toBe("appmeasurement");
  if (hit?.kind === "appmeasurement") {
    expect(hit.pageName).toBe("checkout");
    expect(hit.eVars["12"]).toBe("checkout");
    expect(hit.props["3"]).toBe("checkout-flow");
    expect(hit.events).toEqual([{ id: "event5" }]);
  }
});

test("captures a Web SDK hit fired by a click, including the POST body", async ({ page }) => {
  await page.goto(`file://${path.join(here, "fixtures/websdk.html")}`);

  const hits = await captureAdobeHits(page, () => page.click("#buy"));

  expect(hits).toHaveLength(1);
  const hit = hits[0];
  expect(hit?.kind).toBe("websdk");
  if (hit?.kind === "websdk") {
    expect(hit.events[0]?.analytics?.pageName).toBe("checkout");
    expect(hit.events[0]?.analytics?.events).toEqual(["event5"]);
  }
});

test("returns an empty array when no Adobe hit fires", async ({ page }) => {
  await page.goto(`file://${path.join(here, "fixtures/appmeasurement.html")}`);

  const hits = await captureAdobeHits(page, () => {}, { timeoutMs: 300 });

  expect(hits).toEqual([]);
});

test("does not capture requests that aren't AppMeasurement/Web SDK shaped", async ({ page }) => {
  await page.route("https://fake-unrelated.invalid/**", (route) =>
    route.fulfill({ status: 204, body: "" })
  );
  await page.setContent(`
    <button id="ping">Ping</button>
    <script>
      document.getElementById("ping").addEventListener("click", () => {
        fetch("https://fake-unrelated.invalid/health", { mode: "no-cors" }).catch(() => {});
      });
    </script>
  `);

  const hits = await captureAdobeHits(page, () => page.click("#ping"), { timeoutMs: 300 });

  expect(hits).toEqual([]);
});
