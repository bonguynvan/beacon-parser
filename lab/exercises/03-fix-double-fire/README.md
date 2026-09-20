# Exercise 3: Fix the double-fire bug

**Goal:** the "Buy now" button fires its purchase hit twice per click. Find
out why and fix it so it fires exactly once.

Open `starter.html` and look at how the button's click is wired up.

## Hint

Capture *every* hit the page fires for one click, not just the first one
you notice -- if the same event id shows up in two separate hits, that's
the bug. A common real cause: a button ends up with two separate ways of
triggering the same handler (e.g. both an inline `onclick` attribute and a
later `addEventListener` call), so one click fires it twice. This kind of
bug quietly doubles a metric and is easy to miss just glancing at a report
-- it only shows up when you actually inspect the individual hits.

## Check your answer

```bash
pnpm --filter lab test exercises/03-fix-double-fire
```

## Solution

See `solution.html` for a working version with an explanation comment.
Verify it against the same check:

```bash
EXERCISE_PAGE=solution.html pnpm --filter lab test exercises/03-fix-double-fire
```
