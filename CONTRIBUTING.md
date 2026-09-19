# Contributing

Thanks for considering a contribution to `@bonguynvan/beacon-parser`.

## Reporting bugs

Bug reports **must** include an anonymized hit that reproduces the issue
(URL, method, and body if it's a POST). Before submitting:

- Strip real ECID / `mid` values, user IDs, IPs, and emails.
- Replace real report suite IDs, org IDs, and datastream IDs with fake values
  (e.g. `rsid` -> `examplecompanyprod`, `orgId` -> `EXAMPLE1234@AdobeOrg`).
- Remove any sensitive page URLs (internal hostnames, query strings with
  session tokens, etc.) or replace them with placeholders.
- Never attach raw HAR files — only the specific anonymized request.

Issues opened via the bug report template include a checklist confirming
this. Reports without an anonymized hit may be closed pending one.

## Development setup

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Run lint, typecheck, and test after every change and fix failures before
opening a PR.

## Adding or changing parser behavior

Every parser change needs:

1. A fixture pair in `fixtures/appmeasurement/` or `fixtures/websdk/`
   (`input.json` + `expected.json`), anonymized per the rules above.
2. A corresponding test (snapshot and/or unit test in
   `packages/beacon-parser/test/`).
3. No new runtime dependency in `packages/beacon-parser` without discussion
   first — the core package is zero-dependency by design.

## Commit style

Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, etc.
Keep commits small and focused.

## Versioning

This repo uses [Changesets](https://github.com/changesets/changesets). Run
`pnpm changeset` to describe your change before opening a PR.
