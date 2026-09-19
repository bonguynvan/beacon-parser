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

## Privacy and IP (critical, repo is public)
- Personal repo and machine only. Never use hits, schemas, report suite IDs,
  or configs from any employer or client.
- Every fixture must be anonymized: no real ECID/`mid`/`vid`, user IDs, IPs,
  emails, or sensitive URLs. Use fake `orgId` and `datastreamId`.
- Never commit raw HAR files. Only commit anonymized fixtures.
- Before any commit touching `fixtures/`, scan for leaked identifiers.

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

## Domain notes (verify before relying on them)
- Props: `c1-c75`, eVars: `v1-v250`, hierarchies: `h1-h5`, lists: `list1-3`.
- Context data uses `c.key=value` with `c. ... .c` nesting.
- `events` may carry serialization (`event1=5`, `event2:id`); `products` is a
  delimited string parsed into category/name/qty/price/events/eVars.
- `pe=lnk_o|lnk_d|lnk_e` marks link-tracking hits; `pev2` holds link name.
- Long hits may switch to POST. First-party CNAME domains change the host, so
  detect by path/payload shape, not by hostname.

## Process
1. Propose structure and types first; wait for approval before writing code.
2. Implement Web SDK parsing first, then AppMeasurement.
3. Ask before adding any dependency or expanding scope.
4. When behavior is ambiguous, ask instead of assuming.