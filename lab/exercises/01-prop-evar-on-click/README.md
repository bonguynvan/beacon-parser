# Exercise 1: Set a prop/eVar on a click

**Goal:** make the "Download brochure" button's hit show up as a *link
click* named `download-brochure`, not a plain page view -- while keeping
the eVar5 value it already sends.

Open `starter.html` and edit the inline script directly.

## Hint

AppMeasurement needs `pe=lnk_o` (or `lnk_d` for downloads, `lnk_e` for exit
links) to mark a hit as link tracking instead of a page view. `pev2` is the
link's display name -- what shows up in the "Custom Link" dimension in
reports.

Source: [Custom link | Adobe Analytics](https://experienceleague.adobe.com/en/docs/analytics/components/dimensions/custom-link)

## Check your answer

```bash
pnpm --filter lab test exercises/01-prop-evar-on-click
```

## Solution

See `solution.html` for a working version with explanation comments.
Verify it against the same check:

```bash
EXERCISE_PAGE=solution.html pnpm --filter lab test exercises/01-prop-evar-on-click
```
