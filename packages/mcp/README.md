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

Example prompts:

- "Here's the hit my checkout button fires: `<url>`. What is it sending?"
- "Diff the hits from the old AppMeasurement tag and the new Web SDK one and tell me what I lost in the migration."
- "Validate these captured hits against `plans/checkout.mjs`."

## Things to know

**Privacy.** The hits you give the agent are sent to whatever model your
client uses -- this server is local, your AI client is not. Only use
synthetic or anonymized hits, never one captured from a real, logged-in
session. Every tool's description tells the model the same.

**`validate_hits` executes your plan file.** A tracking plan contains `match`
functions, so loading it runs code. The path must resolve (symlinks
followed) to a `.mjs`/`.js` file inside the server's root directory -- the
directory it was started in, or `--root <dir>`. Anything outside is refused.

```bash
npx -y @bonv/beacon-mcp --root ./tracking-plans
```

**What it doesn't do (yet).** It analyzes hits the agent already has -- from
a browser's network tab, a HAR file you've anonymized, or another tool. It
doesn't drive a browser or run a flow; for that, use
[`@bonv/beacon-cli`](../cli).

**Limits.** Client-side only: it decodes what a browser *sent*, not what
appears in Adobe reports. A Web SDK eVar set via XDM or `contextData` is
mapped server-side in the datastream, so it can't be decoded -- only eVars
set directly on `data.__adobe.analytics` can. Up to 200 hits per call.
