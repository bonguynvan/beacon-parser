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
| `events` | Comma-separated success events, e.g. `event1,event2=5,event3:abc123`. `=` sets a numeric `value`; `:` attaches a `serializationId` (dedup id) | `events` (`EventEntry[]`) |
| `products` | `;`-delimited product entries, `,`-separated list: `category;name;quantity;price;events;eVars` | `products` (`ProductEntry[]`) |
| `pe` | Link tracking type: `lnk_o` (custom), `lnk_d` (download), `lnk_e` (exit) | `linkTrackingType` (`"o" \| "d" \| "e" \| null`) |
| `pev1` | Link URL (only meaningful when `pe` is set) | `linkURL` |
| `pev2` | Link name (only meaningful when `pe` is set) | `linkName` |
| `mid` | Experience Cloud ID (visitor id) | `visitorId` |
| `c1`–`c75` | Props | `props["1"]`–`props["75"]` |
| `v1`–`v250` | eVars | `eVars["1"]`–`eVars["250"]` |
| `h1`–`h5` | Hierarchies | `hierarchies["1"]`–`hierarchies["5"]` |
| `l1`–`l3` | Lists — **wire key is `l1`-`l3`, not `list1`-`list3`**; `list1`-`list3` is only the JS variable name (`s.list1`) that produces it | `lists["1"]`–`lists["3"]` |
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
- The `=` / `:` distinction from top-level `events` (below) applies here too
  — `event1=5|event2:txn-abc123` parses to a numeric value on `event1` and a
  serialization id on `event2`.

## Event serialization

`event3:abc123` (colon syntax) is a per-event serialization/dedup id,
distinct from `event3=5` (numeric value) — see
[event serialization](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/event-serialization).
They are not documented as combinable on the same event; if a token contains
both `:` and `=`, whichever comes first is treated as the delimiter and the
rest of the token (including the other character) becomes that field's value.
Applies both to the top-level `events` param and to events nested inside a
`products` entry — both call the same internal token parser.

## `l1`–`l3` delimiter option

The wire key for list variables is `l1`-`l3` — `list1`-`list3` is only the
JS variable name (`s.list1`) that produces it on the wire. See
[query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters)
(exact row: `l1`-`l3` | `list1`-`list3` | "List variables.").

The delimiter between values in a list variable is also **configured per
report suite, per list** — `l1` and `l2` on the same report suite can use
different delimiters (comma is the common default, but pipe/colon/etc. are
equally valid admin-side choices) — see [list variables](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list).
This parser splits every list on comma by default; pass a `listDelimiter`
option as the second argument to `parseHit()` to override it — either one
delimiter for every list, or an object keyed by the same numeric suffix
`lists` uses ("1"/"2"/"3", not "l1"/"list1") for independent per-list
delimiters:

```ts
parseHit(input, { listDelimiter: "|" });                    // every list uses "|"
parseHit(input, { listDelimiter: { "1": ",", "2": "|" } });  // per-list
```

A list not named in the object form falls back to `,`. `raw["l1"]` always
holds the original un-split string regardless of which delimiter (if any)
was used to populate `lists["1"]`.

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
