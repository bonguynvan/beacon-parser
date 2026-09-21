# @bonv/beacon-mcp

> Independent project. Not affiliated with, endorsed by, or sponsored by
> Adobe. Adobe and Adobe Analytics are trademarks of their respective owners.

An [MCP](https://modelcontextprotocol.io) server that lets an AI agent
(Claude Code, Cursor, Claude Desktop, ...) decode, explain, diff and validate
Adobe Analytics hits, using the same parser as the rest of the toolkit. It
runs locally over stdio -- no hosted service, no account, no network calls.

The point of giving an agent tools instead of letting it eyeball a hit: the
model doesn't have to guess what `v12`, `pev2` or `event5=2.5` means. It
gets typed JSON, plus explanations that cite the Adobe docs page each claim
was verified against and say plainly what the wire *can't* tell you.

## Install

Add it to your MCP client. For Claude Code:

```bash
claude mcp add beacon -- npx -y @bonv/beacon-mcp
```

For clients configured with JSON (Cursor, Claude Desktop, ...):

```json
{
  "mcpServers": {
    "beacon": { "command": "npx", "args": ["-y", "@bonv/beacon-mcp"] }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `parse_hit` | Decode one AppMeasurement or Web SDK hit into typed JSON. Garbage input returns `kind: "unknown"`, never an error. |
| `explain_hit` | Decode a hit and explain each field, with the Experience League page each meaning was verified against, plus a list of what the wire cannot tell you (e.g. what an eVar slot means is a report-suite setting). Deterministic -- no LLM inside the tool. |
| `diff_hits` | Compare hits captured from an old and a new implementation of the same flow (e.g. AppMeasurement -> Web SDK): missing/added events, changed eVars/props, missing/added hits. Best-effort matching by pageName then position. |
| `validate_hits` | Validate hits from one flow against a [tracking plan](../tracking-plan) file. Returns pass/fail with a structured reason per problem. |
| `run_flow` | Run named flows from a `beacon.config.mjs` in a real headless Chromium, capture the hits they fire, and validate them against the config's plan. Returns pass/fail, structured issues and the captured hits. |

Example prompts:

- "Here's the hit my checkout button fires: `<url>`. What is it sending?"
- "Diff the hits from the old AppMeasurement tag and the new Web SDK one and tell me what I lost in the migration."
- "Validate these captured hits against `plans/checkout.mjs`."
- "Run the `checkout` flow from `beacon.config.mjs` and tell me what it fires."

## Things to know

**Privacy.** The hits you give the agent are sent to whatever model your
client uses -- this server is local, your AI client is not. Only use
synthetic or anonymized hits, never one captured from a real, logged-in
session. Every tool's description tells the model the same.

**Prompt injection.** A captured hit comes from an arbitrary website, and a
value inside it (a `pageName`, a context-data string) can be written to read
like an instruction. Every tool's description tells the model to treat hit
contents as untrusted data, and every result ends with a separate notice
saying the same. That reduces the chance a model obeys such text; it cannot
guarantee it. Review what an agent does before approving anything a hit
"asked" for -- especially with clients that auto-approve tool calls.

**`validate_hits` executes your plan file.** A tracking plan contains `match`
functions, so loading it runs code. The path must resolve (symlinks
followed) to a `.mjs`/`.js` file inside the server's root directory -- the
directory it was started in, or `--root <dir>`. Anything outside is refused.

```bash
npx -y @bonv/beacon-mcp --root ./tracking-plans
```

**`run_flow` drives a browser, on your terms.** It needs Chromium once
(`npx playwright install chromium`). The agent chooses flow *names* from a
config you wrote; it can't supply URLs or code. The config is code, so it
must sit inside the root directory (same guard as plans).

**`run_flow` blocks hits by default.** Pointed at a real site, a page's own
tags would send your test traffic into a real report suite. So captured hits
are aborted after they're observed: they still get validated and returned,
but never reach Adobe. Pass `sendHits: true` only against a test or staging
report suite. Caveat: aborting a Web SDK request means the page never gets a
response, which can change what a flow does afterwards.

**Other ways to get hits.** Without `run_flow`, the other tools analyze hits
the agent already has -- from a network tab, a HAR file you've anonymized, or
another tool.

**Limits.** Client-side only: it decodes what a browser *sent*, not what
appears in Adobe reports. A Web SDK eVar set via XDM or `contextData` is
mapped server-side in the datastream, so it can't be decoded -- only eVars
set directly on `data.__adobe.analytics` can. Up to 200 hits per call; `run_flow` returns at most 50 captured hits per flow and stops after 3 minutes.
