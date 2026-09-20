# codemod-appmeasurement-to-websdk (dev-only)

Not part of any published `@bonv/*` package, and deliberately not a
general-purpose migration tool. AppMeasurement -> Web SDK mapping is
customer-specific (numbered eVars/props map to XDM fields server-side, per
datastream config, which this script has no way to know) -- this is a
**consulting aid**: it drafts a starting point for a human to verify and
adapt, not something to run unattended against production code.

## What it does

Scans a JS/TS file for `s.tl()` (link tracking) and `s.t()` (page view)
call sites, collects the `s.propN` / `s.eVarN` / `s.pageName` / `s.events` /
`s.contextData[...]` assignments made earlier in the same block, and
inserts a draft `alloy("sendEvent", ...)` call as a **comment** directly
above each call site.

The original file is **never modified** -- output always goes to a
separate `<file>.websdk-draft.<ext>` file. Every numbered eVar/prop in the
draft carries a `// TODO: rename to this datastream's real XDM field for
propN` comment, because there's no way to know the real mapping without the
target datastream's configuration.

## Usage

```bash
pnpm install
pnpm codemod path/to/file.js
pnpm codemod path/to/file.js --var appMeasurement   # if the tracker isn't named "s"
pnpm codemod path/to/file.js --out draft.js         # custom output path
```

## Known limitations (by design, not bugs to fix)

- Only recognizes the conventional tracker variable name (`s` by default,
  override with `--var`) -- doesn't trace arbitrary aliasing or destructuring.
- Only resolves statically-known literal values (string/number/template
  literals with no interpolation). A value set from a function call or
  variable is silently skipped rather than guessed.
- Scans every preceding statement in the same block, not just immediately
  adjacent ones -- best-effort, same as `diffAdobeHits`'s matching strategy
  elsewhere in this repo. Review the draft against the actual surrounding
  code before using it.
- Does not attempt VISTA rules, processing rules, or any server-side
  configuration -- client-side only, same limitation as the rest of the
  toolkit.
