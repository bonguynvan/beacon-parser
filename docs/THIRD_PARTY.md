# Third-party Adobe libraries

This project is an independent, unaffiliated toolkit for decoding Adobe
Analytics network traffic. It does not redistribute any Adobe code. The
table below lists every Adobe-owned library referenced anywhere in this
repo, why, and its license — kept current per any Adobe-interest guardrail
review.

| Library | Where used | How it's loaded | Version pin | License | Redistributed? |
|---|---|---|---|---|---|
| [`@adobe/alloy`](https://github.com/adobe/alloy) (Web SDK) | `scripts/capture-websdk-fixtures` — a dev-only, unpublished tool that captures real Web SDK request shapes (against a fake org/datastream, never a real Adobe org) to build anonymized test fixtures | Installed fresh from the official npm registry as a `devDependency`, never committed to the repo | `^2.24.0` (currently resolves `2.35.1`) | Apache-2.0 | No — not bundled, not published, not shipped in any package's `dist/` |

## Policy

- Every Adobe library this project touches must be installed from the
  official npm registry (or Adobe's official CDN) with a pinned version —
  never copied into the repo as vendored source, unless that library's
  license explicitly permits redistribution and doing so is deliberately
  chosen (none currently qualify or are needed).
- `scripts/` is dev-only and never published to npm (see its own `package.json`,
  `"private": true`) — nothing in this table reaches an end user of
  `@bonv/beacon-parser` or `@bonv/beacon-playwright`.
- Before adding a new Adobe library dependency anywhere in this repo (including
  a future lab app), add a row here first: license, exact version, where it's
  loaded from, and whether any part of it is redistributed.
