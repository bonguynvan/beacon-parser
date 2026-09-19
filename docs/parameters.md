# AppMeasurement parameter reference

Lookup table for the AppMeasurement query/body parameters this parser
recognizes, and where each one lands in the typed `AppMeasurementHit` output.
Parameters not listed here are preserved verbatim under `raw` and also
surfaced under `unknown` (never dropped, never guessed at).

| Param | Meaning | Output field |
|---|---|---|
| `pageName` | Page name | `pageName` |
| `g` | Current page URL | `pageURL` |
| `r` | Referrer URL | `referrer` |
| `events` | Comma-separated success events, e.g. `event1,event2=5` | `events` (`EventEntry[]`) |
| `products` | `;`-delimited product entries, `,`-separated list: `category;name;quantity;price;events;eVars` | `products` (`ProductEntry[]`) |
| `pe` | Link tracking type: `lnk_o` (exit), `lnk_d` (download), `lnk_e` (custom) | `linkTrackingType` (`"o" \| "d" \| "e" \| null`) |
| `pev1` | Link URL (only meaningful when `pe` is set) | `linkURL` |
| `pev2` | Link name (only meaningful when `pe` is set) | `linkName` |
| `mid` | Experience Cloud ID (visitor id) | `visitorId` |
| `c1`–`c75` | Props | `props["1"]`–`props["75"]` |
| `v1`–`v250` | eVars | `eVars["1"]`–`eVars["250"]` |
| `h1`–`h5` | Hierarchies | `hierarchies["1"]`–`hierarchies["5"]` |
| `list1`–`list3` | Lists (comma-separated values) | `lists["1"]`–`lists["3"]` |
| `c.<key>`, `c.<a>.<b>` | Context data, dot-nested | `contextData` (nested object) |
| `rsid` | Report suite id (query override) | `reportSuiteId` |

Path segments (`/b/ss/{rsid}/{version}/{code}`):

| Segment | Output field |
|---|---|
| `rsid` | `reportSuiteId` (unless overridden by a `rsid` query param) |
| `version` | `version` |
| request type (`ss`) | `requestType` |

## Products sub-format

Each entry in the comma-separated `products` list is `;`-delimited:

```
category;name;quantity;price;events;eVars
```

- `events` within a product entry is **pipe-separated** (`event1|event2=5`),
  not comma-separated — commas are already used to delimit products.
- `eVars` within a product entry is also pipe-separated, as `evarN=value` pairs
  (merchandising eVars), e.g. `evar5=blue|evar10=size-m`.

## Context data nesting

`c.a=1` → `{ a: "1" }`. `c.a.b=2` → `{ a: { b: "2" } }`. Repeated prefixes merge
into the same nested object (`c.a.b=1&c.a.c=2` → `{ a: { b: "1", c: "2" } }`).

## Intentionally not modeled yet (Phase 1)

Common technical/internal params — `AQB`, `AQE`, `ndh`, `pf`, `ce`, `t`, `s`,
`j`, `bw`, `bh`, `k`, and others — are **not** mapped to typed fields. Their
exact semantics vary across AppMeasurement plugin versions and are not fully
documented publicly; per this project's rule against inventing parameter
meanings, they are left under `raw` / `unknown` rather than guessed. If you
need one of these mapped, open an issue with a citation to Adobe's public
parameter reference.
