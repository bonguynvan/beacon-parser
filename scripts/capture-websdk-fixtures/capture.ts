/**
 * Dev-only fixture capture tool. NOT part of the published @bonguynvan/beacon-parser
 * package — run manually with `pnpm capture` when adding new Web SDK fixtures.
 *
 * Loads fixture-page.html (which configures @adobe/alloy with a fake orgId and
 * datastreamId), intercepts requests to the interact/collect endpoints via
 * Playwright's page.route(), and writes each captured payload to ./output/
 * as {url, method, bodyJson} for manual review before copying into
 * fixtures/websdk/<case-name>/input.json.
 *
 * This never talks to a real Adobe org: edgeDomain/datastreamId/orgId are all
 * fake, and interact/collect requests are fulfilled locally rather than
 * forwarded, so no data ever leaves the machine.
 */
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(HERE, "output");
const ALLOY_SRC = path.join(HERE, "node_modules/@adobe/alloy/dist/alloy.min.js");
const ALLOY_DEST = path.join(HERE, "alloy.js");

async function main(): Promise<void> {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  copyFileSync(ALLOY_SRC, ALLOY_DEST);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let captureIndex = 0;

  await page.route(/\/ee\/[^/]*\/(interact|collect)/, async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const postData = request.postData();

    captureIndex += 1;
    const outFile = path.join(OUTPUT_DIR, `capture-${String(captureIndex).padStart(3, "0")}.json`);
    writeFileSync(
      outFile,
      JSON.stringify(
        {
          url,
          method,
          bodyJson: postData ? safeJsonParse(postData) : undefined
        },
        null,
        2
      )
    );
    console.log(`Captured ${method} ${url} -> ${outFile}`);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ handle: [] })
    });
  });

  const fixturePagePath = path.join(HERE, "fixture-page.html");
  await page.goto(`file://${fixturePagePath}`);

  // Give alloy time to configure and fire its initial page-view event.
  await page.waitForTimeout(2000);

  await window_sendEvent(page);
  await page.waitForTimeout(1000);

  await browser.close();

  console.log(`\nDone. Review captures under ${OUTPUT_DIR}, anonymize/trim as needed,`);
  console.log(`then copy the ones you want into fixtures/websdk/<case-name>/input.json.`);
}

async function window_sendEvent(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alloy = (window as any).alloy;
    return alloy("sendEvent", {
      xdm: {
        eventType: "web.webinteraction.linkClicks",
        web: { webInteraction: { name: "fixture-capture-link", type: "other" } }
      },
      data: {
        __adobe: {
          analytics: { pageName: "fixture-capture-page", events: ["event1"] }
        }
      }
    });
  });
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { unparsable: raw };
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
