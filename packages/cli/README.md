# @bonv/beacon-cli

> Independent project. Not affiliated with, endorsed by, or sponsored by
> Adobe. Adobe and Adobe Analytics are trademarks of their respective owners.

Runs Adobe Analytics tracking-plan checks against real flows in a real
browser, and exits non-zero if any flow fails -- the CI entry point for
[`@bonv/tracking-plan`](../tracking-plan). Built on
[`@bonv/beacon-playwright`](../beacon-playwright)'s capture logic, running
outside a test runner via the standalone [`playwright`](https://playwright.dev)
package.

Want to check what a hit decodes to before wiring up a plan/flow? Paste it
into the ["Decode a hit" tab](https://lab.averosi.com/?tab=decode) of the
[learning lab](https://lab.averosi.com).

## Install

```bash
pnpm add -D @bonv/beacon-cli
pnpm exec playwright install chromium   # once, before first run
```

## Usage

Write a plain `.mjs` config exporting a plan and one or more flows:

```js
// beacon.config.mjs
import { definePlan } from "@bonv/tracking-plan";

export default {
  baseURL: "https://example.com",
  plan: definePlan({
    name: "checkout",
    events: [
      {
        name: "purchase",
        match: (hit) => hit.kind === "appmeasurement" && hit.events.some((e) => e.id === "purchase"),
        eVars: { "12": { oneOf: ["checkout"] } },
        events: ["purchase"]
      }
    ]
  }),
  flows: {
    checkout: async (page) => {
      await page.goto("/product/123");
      await page.click("#add-to-cart");
      await page.click("#checkout");
    }
  }
};
```

Then run it:

```bash
npx beacon-qa --config beacon.config.mjs
```

```
PASS  checkout
```

Exits `0` when every flow passes, `1` when any flow fails or the config is
invalid -- wire it into CI the same as any other check.

## Flags

| Flag | Description |
|---|---|
| `--config, -c <path>` | Required. Path to a config file exporting `{ baseURL?, plan, flows }`. |
| `--flow, -f <name>` | Run only this flow. Repeatable. Defaults to every flow in the config. |
| `--block-hits` | Abort Adobe hits after they're captured, so the page's own tags don't send test traffic into a real report suite. Hits are still observed and validated. |
| `--report <path>` | Write a static, self-contained HTML report to this path -- readable by a non-technical stakeholder from a link, no server involved. |
| `--help, -h` | Print usage. |

## Heads up: this sends real hits unless you say otherwise

A flow runs a real browser against a real page, and by default nothing is
blocked -- the page's own tags send their hits to Adobe exactly as they would
for a visitor. Against production, that puts test traffic into your report
suite. Point flows at a staging site or test report suite, or pass
`--block-hits`: requests are observed first, then aborted, so validation
works but nothing reaches Adobe. (Aborting a Web SDK request means the page
never gets a response, which can change what the flow does afterwards.)

## Use it as a library

`loadConfig()` and `runFlows()` are exported for other tools (this is how
[`@bonv/beacon-mcp`](../mcp)'s `run_flow` works):

```ts
import { loadConfig, runFlows } from "@bonv/beacon-cli";

const config = await loadConfig("beacon.config.mjs");
const results = await runFlows(config, ["checkout"], { blockHits: true });
// results[0] = { name, result: ValidateResult, hits: AdobeHit[] }
```

## Why a plain `.mjs` config, not YAML or `.ts`

The config is executable JavaScript, not data, because a flow is
inherently code (clicks, navigation, waiting) -- there's no useful
declarative subset to express that in YAML. `.mjs` rather than `.ts` keeps
this package free of a TypeScript-loader dependency; a config authored in
TypeScript can still `import` a plan built with full type-checking from
`@bonv/tracking-plan` elsewhere in a project and re-export it.

## Limitations

Same as the rest of the toolkit: client-side only. A flow's captured hits
reflect what the browser sent, not what ends up in an Adobe report.
Each flow runs in its own isolated browser context (fresh cookies/storage)
within one shared browser process for the whole run.
