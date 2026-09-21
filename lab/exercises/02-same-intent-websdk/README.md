# Exercise 2: Send the same intent with Web SDK

**Goal:** make this Web SDK event carry the same intent as exercise 1's
AppMeasurement version -- same page, same "link name," same extra data --
using Web SDK's shape instead.

Open `starter.html` and edit the inline script directly.

## Hint

The Analytics-specific part of a Web SDK event lives at
`data.__adobe.analytics`, not in `xdm` directly -- `xdm` carries the
generic Experience Platform event, `__adobe.analytics` is what an
Analytics-configured datastream actually reads. Web SDK can set a numbered
eVar directly there (`data.__adobe.analytics.eVar5`), but this exercise uses
the other common approach: descriptive keys in `contextData`, which the
datastream maps to an eVar server-side (nothing on the wire says which one).
So what you control here is `pageName`, `events`, and your `contextData` keys.

Sources: [events overview](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/events-overview),
[data object field mapping](https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/data-var-mapping)

## Check your answer

```bash
pnpm --filter lab test exercises/02-same-intent-websdk
```

## Solution

See `solution.html` for a working version with explanation comments.
Verify it against the same check:

```bash
EXERCISE_PAGE=solution.html pnpm --filter lab test exercises/02-same-intent-websdk
```
