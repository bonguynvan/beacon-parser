---
"@bonv/beacon-parser": patch
---

Fix several AppMeasurement parsing correctness issues found during review, verified against Adobe's canonical query-parameters reference:

- List variables now recognize the actual wire key (`l1`-`l3`), not the JS variable name (`list1`-`list3`) the code previously matched by mistake.
- `listDelimiter` now accepts either one string (all lists) or an object keyed per list ("1"/"2"/"3"), since the delimiter is configurable per report suite per list.
- Event serialization ids (`event3:abc123`) are now parsed out as `EventEntry.serializationId`, both at the top level and for events nested inside a `products` entry (both previously only handled the numeric `=value` form).
- Fixed `exports["."].types` to resolve per import/require condition, so CommonJS + TypeScript consumers get the correct (CJS-flavored) type declarations instead of being told the package is ESM-only.

No public API removed; `ParseHitOptions.listDelimiter`'s type was widened (string | object) in a backward-compatible way.
