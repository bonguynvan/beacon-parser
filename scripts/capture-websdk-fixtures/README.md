# capture-websdk-fixtures (dev-only)

Not part of the published `@bonv/beacon-parser` package. Captures real
`@adobe/alloy` Web SDK request payloads for use as test fixtures.

Loads `fixture-page.html`, which configures Alloy with a **fake** `orgId` and
`datastreamId` (no real Adobe org involved), fires a couple of events, and
intercepts the resulting `/ee/*/interact` and `/ee/*/collect` requests via
Playwright's `page.route()` before they'd otherwise leave the machine.

## Usage

```bash
pnpm install
pnpm exec playwright install chromium   # first time only
pnpm capture
```

Captured payloads land in `./output/capture-NNN.json` (gitignored). Review
each one, trim/anonymize anything unexpected, then copy the ones you want
into `fixtures/websdk/<case-name>/input.json` and hand-write the matching
`expected.json`.
