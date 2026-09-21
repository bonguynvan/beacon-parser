---
"@bonv/beacon-parser": minor
"@bonv/beacon-playwright": minor
"@bonv/tracking-plan": minor
---

Read Web SDK numbered eVars/props from `data.__adobe.analytics` (Adobe's recommended path).

- `@bonv/beacon-parser`: the Web SDK analytics block now has typed `eVars`, `props`, `pageURL`, `linkName`, `linkURL` and `linkType` (long forms and `vN`/`cN`/`pev1`/`pev2`/`pe`/`g` shorthands). `events` is also accepted as the events-variable string (`"event1,event2=5"`) -- previously only arrays were read, so the string form was invisible to `eventIdsOf`. New `evarsOf()` / `propsOf()` helpers; `eventIdsOf()` now returns bare ids for tokens like `event2=5`; `diffAdobeHits` compares eVars/props across AppMeasurement and Web SDK.
- `@bonv/beacon-playwright`: `toHaveEvar` / `toHaveProp` now match Web SDK hits that set the value in `data.__adobe.analytics`.
- `@bonv/tracking-plan`: `eVars` / `props` rules now apply to Web SDK hits. Behavior change: a required eVar/prop rule on a Web SDK hit that doesn't set it in the data object now reports `missing-field` instead of being skipped.
