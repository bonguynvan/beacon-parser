# beacon-parser

[![npm @bonv/beacon-parser](https://img.shields.io/npm/v/%40bonv%2Fbeacon-parser?label=%40bonv%2Fbeacon-parser)](https://www.npmjs.com/package/@bonv/beacon-parser)
[![npm @bonv/beacon-playwright](https://img.shields.io/npm/v/%40bonv%2Fbeacon-playwright?label=%40bonv%2Fbeacon-playwright)](https://www.npmjs.com/package/@bonv/beacon-playwright)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

> Independent project. Not affiliated with, endorsed by, or sponsored by
> Adobe. Adobe, Adobe Analytics, and AppMeasurement are trademarks of their
> respective owners.

Open-source TypeScript toolkit for Adobe Analytics tag QA — "Omnibug is for
looking, this is for testing." Two packages so far:

- [`@bonv/beacon-parser`](packages/beacon-parser) — zero-dependency parser
  that decodes Adobe Analytics network hits into clean, normalized JSON.
  Also ships `diffAdobeHits()` for comparing two hit sets — useful when
  migrating tags between vendors or generations (AppMeasurement -> Web SDK)
  and checking what broke.
- [`@bonv/beacon-playwright`](packages/beacon-playwright) — capture hits
  during a Playwright test and assert on them with matchers like
  `toHaveAdobeEvent`/`toHaveEvar`.

Supports both hit generations:

- **AppMeasurement** image requests / long POST hits:
  `/b/ss/{rsid}/{version}/{code}`
- **Web SDK (Alloy)** requests: `*/ee/*/interact` or `/collect`

**[Try it live →](https://bonguynvan.github.io/beacon-parser/)** — paste a hit
URL/body and see it decoded in your browser, using the same built package
this repo ships ([source](site/)).

**[Practice implementation →](https://lab.averosi.com)** — no Adobe account
needed: a fake shop with a live hit inspector and three exercises with
automated checks, so you can learn hit anatomy hands-on ([source](lab/)).

## beacon-parser vs Omnibug

Different job, not a replacement. Both understand Adobe Analytics hits;
they're built for different people at different points in the workflow.

| | [Omnibug](https://github.com/MisterPhilip/omnibug) (and the Experience Platform Debugger, Assurance) | beacon-parser |
|---|---|---|
| Who it's for | A human looking at beacons live | Code that asserts on beacons |
| Where it runs | Browser extension | Node, browser, or CI — anywhere JS runs |
| Output | Annotated UI you read | Typed JSON you can `expect()` against |
| Question it answers | "What did this hit just send?" | "Did this hit send what it's supposed to?" |
| Runs in CI | No | Yes (that's the point) |

Use Omnibug while you're building or debugging a tag. Use beacon-parser once
you want "does this still work" to be a test that fails the build, not a
question someone has to remember to ask by hand.

## Install

```bash
pnpm add @bonv/beacon-parser
# or: npm install @bonv/beacon-parser
```

## Usage

### 1. Parse an AppMeasurement image request

```ts
import { parseHit } from "@bonv/beacon-parser";

const hit = parseHit({
  url: "https://metrics.example.com/b/ss/examplecompanyprod/1/H29-9f8e7d6c5b4a" +
    "?pageName=homepage&g=https%3A%2F%2Fwww.example.com%2Fhome&v1=fake-evar-1&c1=fake-prop-1&events=event1"
});

if (hit.kind === "appmeasurement") {
  console.log(hit.pageName);   // "homepage"
  console.log(hit.eVars["1"]); // "fake-evar-1"
  console.log(hit.props["1"]); // "fake-prop-1"
  console.log(hit.events);     // [{ id: "event1" }]
}
```

### 2. Parse a Web SDK (Alloy) interact request

```ts
import { parseHit } from "@bonv/beacon-parser";

const hit = parseHit({
  url: "https://edge.adobedc.net/ee/v1/interact?configId=fake-datastream-id",
  method: "POST",
  body: JSON.stringify({
    events: [
      {
        xdm: { eventType: "web.webpagedetails.pageViews" },
        data: { __adobe: { analytics: { pageName: "homepage", events: ["event1"] } } }
      }
    ]
  })
});

if (hit.kind === "websdk") {
  console.log(hit.events[0]?.analytics?.pageName); // "homepage"
}
```

### 3. Handle any captured hit without knowing its type up front

```ts
import { parseHit } from "@bonv/beacon-parser";

function summarize(url: string, method?: string, body?: string) {
  const hit = parseHit({ url, method: method as "GET" | "POST" | undefined, body });

  switch (hit.kind) {
    case "appmeasurement":
      return `AppMeasurement: ${hit.pageName ?? "(no pageName)"}`;
    case "websdk":
      return `Web SDK: ${hit.events.length} event(s)`;
    case "unknown":
      return `Unrecognized hit: ${hit.reason}`;
  }
}
```

`parseHit` never throws. Unrecognized input returns `{ kind: "unknown", reason, raw }`
instead of raising, so it's safe to run against arbitrary captured network traffic
(e.g. from a Playwright `page.route()` handler or a browser extension).

## Limitations

- **Client-side only.** This library decodes what a browser *sent*. It does not
  verify what ultimately appears in Adobe Analytics/Customer Journey Analytics
  reports — server-side processing (VISTA rules, processing rules, classifications)
  is invisible to it.
- **Validated on synthetic and public-site fixtures, not a live Adobe property.**
  Parameter mappings follow Adobe's public documentation; some technical/internal
  parameters (`AQB`, `ndh`, `t`, etc.) are intentionally left under `unknown` rather
  than guessed at.
- Unknown or malformed fields are always preserved under `raw` / `unknown` — never
  silently dropped — but they are also not further interpreted.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the bug report / fixture anonymization
policy before opening an issue with a captured hit.

## License

Apache-2.0
