import { test, expect as baseExpect } from "@playwright/test";
import { captureAdobeHits, adobeMatchers } from "@bonv/beacon-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const expect = baseExpect.extend(adobeMatchers);
const here = path.dirname(fileURLToPath(import.meta.url));

// Runs against starter.html by default. Point EXERCISE_PAGE at solution.html
// to verify the reference solution passes too:
//   EXERCISE_PAGE=solution.html pnpm --filter lab test exercises/01-prop-evar-on-click
const PAGE = process.env.EXERCISE_PAGE || "starter.html";

test("download brochure fires a named link-tracking hit with eVar5 set", async ({ page }) => {
  await page.goto(`file://${path.join(here, PAGE)}`);

  const hits = await captureAdobeHits(page, () => page.click("#download"));

  expect(hits).toHaveAdobeHit({ kind: "appmeasurement" });
  const hit = hits[0];
  if (hit?.kind !== "appmeasurement") throw new Error("Expected an AppMeasurement hit");

  expect(hit.linkTrackingType).toBe("o");
  expect(hit.linkName).toBe("download-brochure");
  expect(hit.eVars["5"]).toBe("whitepaper-2024");
});
