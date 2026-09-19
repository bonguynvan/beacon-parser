# CLAUDE.md

## Project
Open-source TypeScript toolkit for Adobe Analytics tag QA.
**Phase 1 scope: `@bonguynvan/beacon-parser` only** — a zero-dependency parser that
decodes Adobe Analytics network hits into clean, normalized JSON.

Supported hit generations:
1. AppMeasurement image requests (`/b/ss/{rsid}/{version}/{code}`, incl. POST bodies)
2. Web SDK / Alloy (`*/ee/*/interact` or `/collect`, `events[].xdm`, `data.__adobe.analytics`)

Out of scope until explicitly requested: CLI, Playwright assertions,
tracking-plan-as-code, AppMeasurement -> Web SDK codemod, any UI.

## Hard rules (never break)
- `parseHit()` must NEVER throw on unknown, malformed, or random input.
  Unknown params are preserved under `raw` / `unknown`, never dropped.
- Core package: pure functions, no I/O, **zero runtime dependencies**, works in
  Node and browser.
- Output is a discriminated union: `{ kind: "appmeasurement" | "websdk", ... }`.
- Client-side only. Never claim the parser verifies what appears in Adobe reports.
- Do not invent Adobe parameters. If unsure about a parameter's meaning, mark it
  `TODO: verify against Adobe docs` instead of guessing.

## Privacy and IP (critical, repo is public — hardest category to fix after the fact)
- Personal repo and machine only. Never use hits, schemas, report suite IDs,
  datastream/org IDs, tracking-plan data, or configs sourced from any
  employer, client, or NDA'd engagement — not even "just for local testing,"
  since local test data has a way of ending up in a fixture or a commit.
- Never paste a hit captured from a real, logged-in browsing session (yours
  or anyone else's) into chat/context or a file in this repo, even
  temporarily. Only synthetic or explicitly-anonymized data belongs here.
- Every fixture must be anonymized before it's written to disk, not after:
  - No real ECID / `mid`, user IDs, session IDs, IPs, emails, phone numbers,
    physical addresses, or auth tokens.
  - No real report suite IDs, `orgId`, or datastream/`configId` — always use
    an obviously-fake value (e.g. `examplecompanyprod`,
    `FAKE1234567890ABCDEF@AdobeOrg`, `fake-datastream-id-####`).
  - No real page URLs/referrers that could identify a specific person,
    account, order, or internal (non-public) system. Prefer `example.com`.
  - No real product names/SKUs, order IDs, or pricing pulled from a live
    commerce hit.
- Never commit raw HAR files, raw browser exports, or captured Playwright
  request logs — only hand-reviewed, anonymized `input.json`/`expected.json`
  fixture pairs. `scripts/capture-websdk-fixtures` writes to a gitignored
  `output/` for exactly this reason: it is a staging area, not a source of
  truth to copy from without review.
- `scripts/capture-websdk-fixtures` must only ever point at the fake
  `edgeDomain`/`orgId`/`datastreamId` already configured in
  `fixture-page.html`. Never repoint it at a real Adobe org or a real site.
- Before any commit or PR that touches `fixtures/` or `scripts/`, grep the
  diff for identifier-shaped strings (long hex/base64 IDs, `@AdobeOrg`,
  email patterns, non-`example.com`/`fake-*` hostnames) and confirm each one
  is intentionally fake. When in doubt, ask before committing rather than
  after.
- No hardcoded secrets, API keys, or tokens anywhere in the repo (applies to
  `scripts/` too, even though it's dev-only and unpublished).

## Commands
- `pnpm install`
- `pnpm build` (tsup: ESM + CJS + d.ts)
- `pnpm test` (Vitest)
- `pnpm lint` / `pnpm typecheck`
- Run lint, typecheck, and test after every change and fix failures before moving on.

## Structure
- `packages/beacon-parser/` — the published package
- `fixtures/` — anonymized sample hits (input + expected output JSON)
- `scripts/` — dev-only tooling (e.g. Playwright fixture capture). NOT published.
- `docs/parameters.md` — AppMeasurement parameter lookup table

## Conventions
- TypeScript `strict`. No `any` without a comment explaining why.
- Prefer small pure functions and explicit types over clever abstractions.
- Every parser change needs a fixture and test. Snapshot tests over fixtures,
  plus property-style tests proving `parseHit` never throws.
- Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Keep commits small.
- Versioning via Changesets. License: Apache-2.0.

## Domain notes
Cross-checked against Experience League docs (2026-09). Re-verify before
adding new param mappings — prefer WebFetch/WebSearch on
experienceleague.adobe.com over memory.
- Props: `c1-c75`, eVars: `v1-v250`, hierarchies: `h1-h5`, lists: `list1-3`.
- Context data uses `c.key=value` with `c.a.b=value` dot-path nesting.
- `events` is comma-delimited. Two independent, unrelated suffixes exist:
  - `=` sets/increments a numeric event value, e.g. `event1=5`.
  - `:` attaches a serialization/dedup ID (alphanumeric, max 20 bytes),
    e.g. `event2:abc123`.
  Source: https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/event-serialization
  **Known gap:** `src/appmeasurement/events.ts` currently only parses the `=`
  form. The `:` serialization ID is dropped into the event id string
  unparsed (not extracted as a separate field) — needs a fixture + fix
  before this is fully spec-compliant.
- `products` is a `,`-separated list of entries, each `;`-delimited as
  `category;product;quantity;price;events;eVars`. Within one entry, both
  `events` and `eVars` are `|`-pipe-delimited (comma is already the
  product separator). Source: https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/products
- `pe` marks a link-tracking hit (`s.tl()`, not a page view). Verified
  mapping — do NOT swap these, it's easy to get backwards:
  - `pe=lnk_o` → **custom** link
  - `pe=lnk_d` → **download** link
  - `pe=lnk_e` → **exit** link
  `pev2` = link name; `pev1` = link URL (used as the display fallback only
  when `pev2` is absent). Source: https://experienceleague.adobe.com/en/docs/analytics/components/dimensions/custom-link
- `list1-3` values are `,`-joined by AppMeasurement's default plugin
  behavior, **but the delimiter is configurable per report suite** (comma,
  pipe, colon, etc. are all valid admin-side choices) — our parser assumes
  comma. Treat any `lists` output as a best-effort default, not a
  guarantee; flag this explicitly if a fixture ever shows a different
  delimiter. Source: https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list
- Long hits may switch to POST. First-party CNAME domains change the host, so
  detect by path/payload shape, not by hostname.

## Process
1. Propose structure and types first; wait for approval before writing code.
2. Implement Web SDK parsing first, then AppMeasurement.
3. Ask before adding any dependency or expanding scope.
4. When behavior is ambiguous, ask instead of assuming.