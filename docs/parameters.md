# AppMeasurement parameter reference

Lookup table for the AppMeasurement query/body parameters this parser
recognizes, and where each one lands in the typed `AppMeasurementHit` output.
Parameters not listed here are preserved verbatim under `raw` and also
surfaced under `unknown` (never dropped, never guessed at).

Every row cites the Adobe Experience League page it was verified against —
follow the link and check it yourself rather than trusting the claim.

| Wire param | Meaning | Output field | Source |
|---|---|---|---|
| `pageName` | Page name (JS var `s.pageName`) | `pageName` | [pageName](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/pagename) |
| `g` | Current page URL (JS var `s.pageURL`) | `pageURL` | [pageURL](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/pageurl), [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters) |
| `r` | Referring URL (JS var `s.referrer`) | `referrer` | [referrer](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/referrer) |
| `events` | Comma-separated success events, e.g. `event1,event2=5,event3:abc123`. `=` sets a numeric `value`; `:` attaches a `serializationId` (dedup id) | `events` (`EventEntry[]`) | [events overview](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/events-overview), [event serialization](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/event-serialization) |
| `products` | `;`-delimited product entries, `,`-separated list: `category;name;quantity;price;events;eVars` | `products` (`ProductEntry[]`) | [products](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/products) |
| `pe` | Hit type. Link tracking values: `lnk_o` (custom), `lnk_d` (download), `lnk_e` (exit). (A 4th value, `tnt`, marks Target/A4T hits — not modeled here.) | `linkTrackingType` (`"o" \| "d" \| "e" \| null`) | [custom link](https://experienceleague.adobe.com/en/docs/analytics/components/dimensions/custom-link), [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters) |
| `pev1` | Link URL (only meaningful when `pe` is set) | `linkURL` | [custom link](https://experienceleague.adobe.com/en/docs/analytics/components/dimensions/custom-link) |
| `pev2` | Link name (only meaningful when `pe` is set) | `linkName` | [custom link](https://experienceleague.adobe.com/en/docs/analytics/components/dimensions/custom-link) |
| `mid` | Experience Cloud Visitor ID | `visitorId` | [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters), [visitor identification](https://experienceleague.adobe.com/en/docs/analytics/implementation/id/appmeasurement) |
| `c1`–`c75` | Props (JS var `s.prop1`–`s.prop75`) | `props["1"]`–`props["75"]` | [prop](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/prop), [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters) |
| `v1`–`v250` | eVars (JS var `s.eVar1`–`s.eVar250`) | `eVars["1"]`–`eVars["250"]` | [eVar](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/evar), [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters) |
| `h1`–`h5` | Hierarchies (JS var `s.hier1`–`s.hier5`). **Retired** by Adobe — not an available dimension in Analysis Workspace — but still decoded here since older/legacy hits may still send it | `hierarchies["1"]`–`hierarchies["5"]` | [hier](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/hier), [page variables (retired)](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/page-variables) |
| `l1`–`l3` | Lists — **wire key is `l1`-`l3`, not `list1`-`list3`**; `list1`-`list3` is only the JS variable name (`s.list1`) that produces it | `lists["1"]`–`lists["3"]` | [list](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list), [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters) (exact table row: `l1`-`l3` ↔ `list1`-`list3`) |
| `c.<key>`, `c.<a>.<b>` | Context data, dot-nested | `contextData` (nested object) | context data is documented alongside `products`/`events` implementation, not as its own page; nesting behavior here is inferred from the wire format, not a single canonical page — treat with more caution than the rows above |
| `rsid` | Report suite id (query override of the path segment) | `reportSuiteId` | [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters) |

Path segments (`/b/ss/{rsid}/{version}/{code}`):

| Segment | Output field | Source |
|---|---|---|
| `rsid` | `reportSuiteId` (unless overridden by a `rsid` query param) | [query params](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters) — describes the image-request path shape |
| `version` | `version` | same as above |
| request type (`ss`) | `requestType` | same as above |

## Web SDK: `data.__adobe.analytics` keys

Adobe's recommended way to set Analytics variables with the Web SDK is the
`data.__adobe.analytics` object (no XDM schema needed). The parser lifts
these documented keys into typed fields on `hit.events[].analytics`; every
other key is preserved untouched. Long form and shorthand are both read.

| Key (long / shorthand) | Output field |
|---|---|
| `eVar1`-`eVar250` / `v1`-`v250` | `eVars["1"]`-`eVars["250"]` |
| `prop1`-`prop75` / `c1`-`c75` | `props["1"]`-`props["75"]` |
| `events` (events-variable string, e.g. `"event1,event2=5"`; an array is also read) | `events` (token array; `eventIdsOf()` gives bare ids) |
| `pageURL` / `g` | `pageURL` |
| `linkName` / `pev2`, `linkURL` / `pev1`, `linkType` / `pe` (`o`, `d`, `e`) | `linkName`, `linkURL`, `linkType` |
| `pageName`, `contextData` | `pageName`, `contextData` |
| `products` (AppMeasurement syntax) | left raw -- `TODO: parse`, not yet modeled |

Source: [data object field mapping](https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/data-var-mapping)

Not documented by Adobe, so `TODO: verify`: precedence when both a long form
and its shorthand are sent (the parser lets the long form win), and whether
`events` as an array is officially supported or merely tolerated (both are
read). Indexes outside 1-250 / 1-75 are not lifted. A Web SDK eVar set via
XDM or `contextData` instead is mapped server-side (datastream config) --
nothing on the wire says which eVar it lands in, so it can't be decoded.

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

Source: [products](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/products)
(full example string quoted verbatim from that page).

## Event serialization

`event3:abc123` (colon syntax) is a per-event serialization/dedup id,
distinct from `event3=5` (numeric value). They are not documented as
combinable on the same event; if a token contains both `:` and `=`,
whichever comes first is treated as the delimiter and the rest of the token
(including the other character) becomes that field's value. Applies both to
the top-level `events` param and to events nested inside a `products` entry.

Source: [event serialization](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/event-serialization)

## `l1`–`l3` delimiter option

The delimiter between values in a list variable is **configured per report
suite, per list** — `l1` and `l2` on the same report suite can use different
delimiters (comma is the common default, but pipe/colon/etc. are equally
valid admin-side choices). This parser splits every list on comma by
default; pass a `listDelimiter` option as the second argument to
`parseHit()` to override it — either one delimiter for every list, or an
object keyed by the same numeric suffix `lists` uses ("1"/"2"/"3", not
"l1"/"list1") for independent per-list delimiters:

```ts
parseHit(input, { listDelimiter: "|" });                    // every list uses "|"
parseHit(input, { listDelimiter: { "1": ",", "2": "|" } });  // per-list
```

A list not named in the object form falls back to `,`. `raw["l1"]` always
holds the original un-split string regardless of which delimiter (if any)
was used to populate `lists["1"]`.

Source: [list](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list)

## Context data nesting

`c.a=1` → `{ a: "1" }`. `c.a.b=2` → `{ a: { b: "2" } }`. Repeated prefixes merge
into the same nested object (`c.a.b=1&c.a.c=2` → `{ a: { b: "1", c: "2" } }`).
Not independently verified against a single canonical Adobe page — see the
caveat in the table above.

## Intentionally not modeled yet (Phase 1)

Common technical/internal params — `AQB`, `AQE`, `ndh`, `pf`, `ce`, `t`, `s`,
`j`, `bw`, `bh`, `k`, and others — are **not** mapped to typed fields, even
though several of them (`s` = screen resolution, `server`/`sv` = server
dimension, `c` = color depth, etc.) do have documented meanings in Adobe's
[query parameters reference](https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters).
They're left under `raw` / `unknown` anyway because they weren't in this
project's Phase 1 scope and haven't been fixture-tested — "documented
elsewhere" isn't the same bar as "verified and tested here." If you need one
of these mapped, open an issue citing the exact Adobe doc row and it can be
added deliberately, with a fixture.
