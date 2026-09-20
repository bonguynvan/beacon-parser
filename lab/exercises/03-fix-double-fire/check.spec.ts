import { test, expect } from "@playwright/test";
import { captureAdobeHits } from "@bonv/beacon-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = process.env.EXERCISE_PAGE || "starter.html";

test("buy now fires exactly one purchase hit per click", async ({ page }) => {
  await page.goto(`file://${path.join(here, PAGE)}`);

  const hits = await captureAdobeHits(page, () => page.click("#buy"));

  const purchaseHits = hits.filter(
    (hit) => hit.kind === "appmeasurement" && hit.events.some((event) => event.id === "purchase")
  );
  expect(purchaseHits).toHaveLength(1);
});
