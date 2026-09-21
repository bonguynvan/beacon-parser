---
"@bonv/beacon-cli": minor
---

Expose a library entry (`loadConfig`, `runFlows`) and add a `--block-hits` option.

- `runFlows()` now returns the captured `hits` on each `FlowResult` and accepts `{ blockHits }`. With `blockHits` (CLI: `--block-hits`), Adobe hits are aborted after they're captured, so the page's own tags don't send test traffic into a real report suite; they're still observed and validated.
- Off by default, matching a plain browser run. The README now warns that flows run against production send real hits unless this is set.
