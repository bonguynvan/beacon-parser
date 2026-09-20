import { test, expect } from "@playwright/test";
import { captureAdobeHits } from "@bonv/beacon-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = process.env.EXERCISE_PAGE || "starter.html";

test("download brochure fires an equivalent Web SDK event", async ({ page }) => {
  await page.goto(`file://${path.join(here, PAGE)}`);

  const hits = await captureAdobeHits(page, () => page.click("#download"));

  expect(hits).toHaveLength(1);
  const hit = hits[0];
  if (hit?.kind !== "websdk") throw new Error("Expected a Web SDK hit");

  const analytics = hit.events[0]?.analytics;
  expect(analytics?.pageName).toBe("product-detail");
  expect(analytics?.events).toContain("download-brochure");
  expect(analytics?.contextData).toMatchObject({ "asset.name": "whitepaper-2024" });
});
