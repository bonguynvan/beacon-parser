# @bonv/beacon-playwright

Capture and assert on Adobe Analytics hits (AppMeasurement + Web SDK) in
Playwright tests. Built on [`@bonv/beacon-parser`](../beacon-parser) — the
same zero-dependency decoder, wired into a real browser session.

## Install

```bash
pnpm add -D @bonv/beacon-playwright @playwright/test
```

`@playwright/test` is a peer dependency — bring your own version.

## Usage

```ts
import { test, expect as baseExpect } from "@playwright/test";
import { captureAdobeHits, adobeMatchers } from "@bonv/beacon-playwright";

const expect = baseExpect.extend(adobeMatchers);

test("buy button fires the right Adobe Analytics event", async ({ page }) => {
  await page.goto("https://example.com/product/123");

  const hits = await captureAdobeHits(page, () => page.click("#buy"));

  expect(hits).toHaveAdobeEvent("event5");
  expect(hits).toHaveEvar(12, "checkout");
});
```

That's the whole example — under 10 lines once imports are excluded.

## `captureAdobeHits(page, action, options?)`

Runs `action()` against `page`, passively observing (not intercepting —
nothing here blocks, delays, or fulfills a request) network traffic, and
returns every AppMeasurement or Web SDK hit fired as a result, already
parsed with beacon-parser. Requests that don't match either hit shape are
ignored.

```ts
interface CaptureOptions {
  timeoutMs?: number;     // overall cap waiting for hits after action() resolves. Default 2000.
  settleMs?: number;      // quiet period with no new hit before capture is done. Default 300.
  listDelimiter?: string | Partial<Record<"1" | "2" | "3", string>>; // passed through to parseHit()
}
```

If nothing matches, capture always waits the full `timeoutMs` before giving
up — so `expect(hits).toEqual([])` assertions are reliable, not just fast.

## Matchers

```ts
import { expect as baseExpect } from "@playwright/test";
import { adobeMatchers } from "@bonv/beacon-playwright";

const expect = baseExpect.extend(adobeMatchers);
```

| Matcher | Checks |
|---|---|
| `toHaveAdobeHit({ kind?, pageName? })` | At least one hit matches the given kind and/or page name |
| `toHaveAdobeEvent(eventId)` | At least one hit fired the given event (AppMeasurement `events[].id` or Web SDK `__adobe.analytics.events[]`) |
| `toHaveEvar(index, expected)` | At least one **AppMeasurement** hit has that eVar value |
| `toHaveProp(index, expected)` | At least one **AppMeasurement** hit has that prop value |

`toHaveEvar`/`toHaveProp` only ever match AppMeasurement hits. Web SDK
doesn't carry numbered eVars/props on the wire — that mapping happens
server-side, in the datastream configuration — so there's nothing on a
captured Web SDK hit for these to check.

Every matcher's failure message includes the full list of captured hits as
JSON, so a failing assertion shows you what actually fired instead of just
"expected true, got false."

## Limitations

Same as beacon-parser: client-side only, doesn't verify what shows up in
Adobe's reports. This package adds nothing server-side — it observes
exactly what the browser sent, same as beacon-parser does with a captured
hit.
