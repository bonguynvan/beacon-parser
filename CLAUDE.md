# CLAUDE.md

## Project
**If a local `PLAN.md` exists in this repo, read it first** — it's the
maintainer's private roadmap doc (git-ignored, intentionally not part of the
public repo — it's their own idea/plan, kept off GitHub on purpose) and is
the source of truth for phases, goals, and non-goals when present. This
section is a public-safe summary for contributors who don't have it.

Programmatic Adobe Analytics tag QA toolkit, runnable in CI ("Omnibug is for
looking, this is for testing"). `@bonv/beacon-parser` is the foundation, not
the product — `@bonv/beacon-playwright` is the first thing built on top of
it; tracking-plan validation, a CLI, and a codemod are later, gated phases
(PLAN.md §5–6).

**Before starting any task, state which phase in PLAN.md it belongs to.** If
it belongs to a gated phase (Phase 3+) or a PLAN.md §4 non-goal, ask before
building instead of proceeding.

Status as of this file's last edit: Phase 1 (parser) is code-complete —
published on GitHub, playground built, npm publish in progress. Phase 1.5
(launch: blog post, positioning vs Omnibug, lab v0) is in progress — README
positioning shipped, blog/LinkedIn/community posts explicitly deferred by
the maintainer (not skipped, just not blocking); **the lab (`lab/`) is
built** — tiny shop, live inspector, 3 exercises with real Playwright
checks, all verified end-to-end — but not yet deployed (maintainer is
connecting Cloudflare Pages to `lab.averosi.com` themselves). **Phase 2
(Playwright test layer) is done, including the stretch goal** —
`capture.ts` + `matchers.ts` in `@bonv/beacon-playwright` (`captureAdobeHits`,
`toHaveAdobeHit`, `toHaveAdobeEvent`, `toHaveEvar`, `toHaveProp`) are built
and tested end-to-end with real Chromium; `diffAdobeHits` (migration parity
diff) is built in `@bonv/beacon-parser` instead of beacon-playwright (it's
pure data comparison with zero Playwright dependency — see the diff.ts
module comment for the pageName-then-position matching strategy that was
decided before implementing).

Supported hit generations (parser, Phase 1):
1. AppMeasurement image requests (`/b/ss/{rsid}/{version}/{code}`, incl. POST bodies)
2. Web SDK / Alloy (`*/ee/*/interact` or `/collect`, `events[].xdm`, `data.__adobe.analytics`)

Out of scope until PLAN.md says otherwise: CLI, tracking-plan-as-code,
AppMeasurement -> Web SDK codemod, any human-facing debugger UI (PLAN.md §4
non-goal — Omnibug already covers that).

## Adobe-interest guardrails (public-safe summary — full version, with the why, is in the private PLAN.md §4b if present)
These apply regardless of whether PLAN.md is available to you. Not legal
advice; when unsure, stop and ask the maintainer.
- Never imply Adobe affiliation, endorsement, or sponsorship. Public pages
  carry: "Independent project. Not affiliated with, endorsed by, or sponsored
  by Adobe." (README.md, package READMEs, and lab/site/index.html already do.)
- No Adobe logos/branding, and no "Adobe" in package names, domains, or app
  names. Product names only in factual, descriptive use.
- Never redistribute Adobe proprietary code. Adobe libraries (e.g.
  `@adobe/alloy`) are installed from official npm/CDN, pinned, never vendored
  — see `docs/THIRD_PARTY.md`, update it before adding any new Adobe dependency.
- Never hit a real Adobe endpoint from tests or tooling, even with fake IDs —
  use non-routable hosts (e.g. `.invalid` domains) or local interception.
- Do not build anything that imitates or replaces Adobe's reporting product
  (no Analysis-Workspace-like UI, no segmentation/attribution engine).
- Do not scrape, mirror, or circumvent access to Adobe's gated
  docs/sandboxes/entitlements. Link to official resources instead.
- Do not copy Adobe documentation text — paraphrase and cite a source link
  per claim; mark unknowns `TODO: verify` rather than guessing.
- Only decode what a client visibly sends and what public docs describe; label
  anything inferred as "observed, undocumented."

## Hard rules (never break)
- `parseHit()` must NEVER throw on unknown, malformed, or random input.
  Unknown params are preserved under `raw` / `unknown`, never dropped.
- Core package: pure functions, no I/O, **zero runtime dependencies**, works in
  Node and browser.
- Output is a discriminated union: `{ kind: "appmeasurement" | "websdk", ... }`.
- Client-side only. Never claim the parser verifies what appears in Adobe reports.
- Do not invent Adobe parameters. If unsure about a parameter's meaning, mark it
  `TODO: verify against Adobe docs` instead of guessing.
- When verifying a parameter, prefer Adobe's canonical wire-level reference —
  https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters
  — over a JS-variable-name doc page. The JS variable name (`s.list1`) and
  the wire key (`l1`) are sometimes different; the `l1`-vs-`list1` bug this
  project shipped (see Domain notes) is exactly what happens when you verify
  against the wrong one of the two.

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
- `pnpm exec playwright install chromium` (once, before running tests — beacon-playwright's own test suite needs a real browser)
- `pnpm build` (tsup: ESM + CJS + d.ts, both packages)
- `pnpm test` (Vitest for beacon-parser, `playwright test` for beacon-playwright)
- `pnpm test:lab` (runs the lab's 3 exercise checks against `solution.html` — what CI runs; `pnpm --filter lab test` runs them against `starter.html` instead, which is expected to fail until a learner fixes it)
- `pnpm lab:build` (copy the built parser + `shared/hit-render.js` into `lab/site/` for static hosting)
- `pnpm lint` / `pnpm typecheck`
- Run lint, typecheck, and test after every change and fix failures before moving on.

## Structure
- `packages/beacon-parser/` — the published parser package
- `packages/beacon-playwright/` — the published Playwright capture/matchers package (Phase 2); depends on beacon-parser, treats `@playwright/test` as a peer dep only
- `packages/tracking-plan/` — the published tracking-plan-as-code package (Phase 3); depends on beacon-parser only
- `packages/cli/` — the published `beacon-qa` CLI (Phase 4); depends on beacon-parser, beacon-playwright, tracking-plan, and `playwright` itself (the only package with a real, non-workspace runtime dependency)
- `lab/` — the hosted tool at `lab.averosi.com` (Cloudflare Pages): `site/` (tiny shop + live inspector + a "Decode a hit" tab — the former standalone GitHub Pages playground merged in here so there's one hosted destination instead of two), `exercises/` (3 exercises, each with `starter.html`/`solution.html`/`check.spec.ts` using real `@bonv/beacon-playwright` matchers)
- `site/` — now just a static redirect stub on GitHub Pages (`bonguynvan.github.io/beacon-parser/` → `lab.averosi.com/?tab=decode`) for old inbound links; not a page to edit for features
- `shared/hit-render.js` — JSON syntax highlighter + kind-badge renderer, copied into `lab/site/` at build time (kept as a shared file since other static pages may need it again later)
- `fixtures/` — anonymized sample hits for beacon-parser (input + expected output JSON)
- `scripts/` — dev-only tooling (e.g. Playwright fixture capture). NOT published.
- `docs/parameters.md` — AppMeasurement parameter lookup table
- `docs/THIRD_PARTY.md` — every Adobe-owned library referenced anywhere in the
  repo, its license, and whether it's redistributed (it never is). Add a row
  here before adding any new Adobe dependency, anywhere, including a future lab.

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
- Props: `c1-c75`, eVars: `v1-v250`, hierarchies: `h1-h5`, lists: **`l1-l3`
  on the wire** (`list1-3` is only the JS variable name — see below, this
  was a real bug, not just a naming nit).
- Context data uses `c.key=value` with `c.a.b=value` dot-path nesting.
- `events` is comma-delimited. Two independent, unrelated suffixes exist:
  - `=` sets/increments a numeric event value, e.g. `event1=5`.
  - `:` attaches a serialization/dedup ID (alphanumeric, max 20 bytes),
    e.g. `event2:abc123`.
  Both are parsed into separate `EventEntry.value` / `EventEntry.serializationId`
  fields (fixed 2026-09, see `fixtures/appmeasurement/09-event-serialization-id`).
  Not documented as combinable on one event; if both appear in one token,
  whichever delimiter comes first wins and the rest of the token becomes
  that field's raw value. `appmeasurement/events.ts` and `products.ts` share
  one `parseEventToken()` — products.ts had the exact same `=`-only gap
  until 2026-09 (see `fixtures/appmeasurement/11-product-event-serialization`);
  if you ever add a third place that parses "eventN..." tokens, reuse
  `parseEventToken` rather than re-deriving the `=`/`:` logic again.
  Source: https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/event-serialization
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
- **List wire key is `l1`/`l2`/`l3`, not `list1`/`list2`/`list3`.** Adobe's
  query-parameters reference gives the mapping explicitly: wire `l1-l3` ↔
  JS var `s.list1`-`s.list3`. The parser originally matched `list1-3`
  literally — a real bug (every real captured hit would have silently
  landed its list values in `unknown` instead of `lists`), fixed 2026-09.
  If you're tempted to "clean up" `LIST_RE` back to `/^list([1-3])$/`
  because it reads more consistently with the JS variable name, don't —
  re-read this note and the source link first.
  Source: https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters
  (exact row: `l1`-`l3` | `list1`-`list3` | "List variables."), corroborated by
  https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list
- List values are `,`-joined by AppMeasurement's default plugin behavior,
  **but the delimiter is configurable per report suite, per list** — `l1`
  and `l2` on the same report suite can use different delimiters. Comma,
  pipe, colon, etc. are all valid admin-side choices. `parseHit()` defaults
  every list to comma but takes an optional second `ParseHitOptions`
  argument, `listDelimiter`, accepting either a single string (applies to
  every list) or an object keyed by numeric suffix for independent per-list
  delimiters:
  ```ts
  parseHit(input, { listDelimiter: "|" });
  parseHit(input, { listDelimiter: { "1": ",", "2": "|" } });
  ```
  A list not named in the object form falls back to `,` (fixed 2026-09).
  `raw["lN"]` always keeps the un-split original regardless of the
  delimiter used.
  Source: https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list
- Long hits may switch to POST. First-party CNAME domains change the host, so
  detect by path/payload shape, not by hostname.

## Process
0. State which PLAN.md phase the task belongs to before starting. If it's a
   gated phase (3+) or a PLAN.md §4 non-goal, ask before building.
1. Propose structure and types first; wait for approval before writing code.
2. Implement Web SDK parsing first, then AppMeasurement.
3. Ask before adding any dependency or expanding scope.
4. When behavior is ambiguous, ask instead of assuming.