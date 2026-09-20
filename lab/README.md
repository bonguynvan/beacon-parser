# beacon-parser lab

> Independent, educational project. Not affiliated with, endorsed by, or
> sponsored by Adobe. Adobe and Adobe Analytics are trademarks of their
> respective owners.

Practice Adobe Analytics implementation without an Adobe account: a fake
shop, an inspector panel that decodes every "tracking call" live, and three
exercises with automated checks. Built on
[`@bonv/beacon-parser`](../packages/beacon-parser) and
[`@bonv/beacon-playwright`](../packages/beacon-playwright).

**Every request is intercepted before it leaves the browser** (`site/interceptor.js`
patches `fetch`, `XMLHttpRequest`, `Image.prototype.src`, and
`navigator.sendBeacon`) -- nothing is ever sent anywhere, real or fake. This
teaches what a browser *sends*, never what a report would *show*. For the
reporting side and the full official docs, see
[Adobe Experience League](https://experienceleague.adobe.com/en/docs/analytics).

## Run the shop locally

```bash
pnpm --filter lab build   # copies the built parser + shared UI bits into site/
```

Then serve `lab/site/` with any static file server and open it (it's plain
HTML/JS, no bundler needed).

## Do the exercises

Each exercise in `exercises/` has a `README.md` (goal + hint), a
`starter.html` you edit, a `solution.html` to compare against, and a
`check.spec.ts` that verifies your fix with real
[`@bonv/beacon-playwright`](../packages/beacon-playwright) matchers.

```bash
pnpm install
pnpm exec playwright install chromium   # first time only

# Check one exercise against your edited starter.html:
pnpm --filter lab test exercises/01-prop-evar-on-click

# Compare one exercise against its reference solution:
EXERCISE_PAGE=solution.html pnpm --filter lab test exercises/01-prop-evar-on-click
# (PowerShell/cmd.exe: use `pnpm --filter lab test:solutions` for all three instead)

# Run every exercise's check at once, against starter.html:
pnpm --filter lab test

# Verify every reference solution passes (what CI actually runs; portable, no env var needed):
pnpm test:lab
```

## Limitations

- Client-side only. Shows what a browser sends, not what ends up in an
  Adobe report -- server-side processing (VISTA rules, processing rules,
  classifications) is invisible here, same as the parser itself.
- No real Adobe org, datastream, or report suite is ever involved -- every
  ID in this lab is obviously fake, and every request is intercepted before
  any network call is attempted.
- Three exercises, on purpose. This teaches the basics of what gets sent,
  not a full Adobe Analytics course -- see Adobe Experience League for that.
