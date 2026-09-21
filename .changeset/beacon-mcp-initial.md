---
"@bonv/beacon-mcp": minor
---

Initial release: an MCP server (stdio, local only) exposing `parse_hit`, `explain_hit`, `diff_hits`, `validate_hits` and `run_flow` so AI agents can decode, explain, diff and validate Adobe Analytics hits, and run a user-written flow in a real browser (hits are blocked from reaching Adobe unless `sendHits` is set).
