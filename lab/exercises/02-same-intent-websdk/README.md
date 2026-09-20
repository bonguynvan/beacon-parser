# Exercise 2: Send the same intent with Web SDK

**Goal:** make this Web SDK event carry the same intent as exercise 1's
AppMeasurement version -- same page, same "link name," same extra data --
using Web SDK's shape instead.

Open `starter.html` and edit the inline script directly.

## Hint

The Analytics-specific part of a Web SDK event lives at
`data.__adobe.analytics`, not in `xdm` directly -- `xdm` carries the
generic Experience Platform event, `__adobe.analytics` is what an
Analytics-configured datastream actually reads. There's no numbered eVar on
the wire here (that mapping happens server-side, in the datastream
config) -- what you control client-side is `pageName`, `events`, and
whatever descriptive keys you put in `contextData`.

Source: [events overview](https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/events-overview)

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
