# beacon-parser

Open-source TypeScript toolkit for Adobe Analytics tag QA. **Phase 1** is a
zero-dependency parser, [`@bonv/beacon-parser`](packages/beacon-parser),
that decodes Adobe Analytics network hits into clean, normalized JSON.

Supports both hit generations:

- **AppMeasurement** image requests / long POST hits:
  `/b/ss/{rsid}/{version}/{code}`
- **Web SDK (Alloy)** requests: `*/ee/*/interact` or `/collect`

**[Try it live →](https://bonguynvan.github.io/beacon-parser/)** — paste a hit
URL/body and see it decoded in your browser, using the exact package
published to npm ([source](site/)).

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
