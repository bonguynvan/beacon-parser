# @bonv/beacon-parser

> Independent project. Not affiliated with, endorsed by, or sponsored by
> Adobe. Adobe and Adobe Analytics are trademarks of their respective owners.

Zero-dependency TypeScript parser that decodes Adobe Analytics network hits
(AppMeasurement + Web SDK) into clean, normalized JSON.

Part of the [beacon-parser toolkit](https://github.com/bonguynvan/beacon-parser)
("Omnibug is for looking, this is for testing"). See the
["Decode a hit" tab](https://lab.averosi.com/?tab=decode) of the
[learning lab](https://lab.averosi.com) to try it without installing
anything, and
[docs/parameters.md](https://github.com/bonguynvan/beacon-parser/blob/main/docs/parameters.md)
for the full AppMeasurement parameter reference, with an Adobe source cited
next to every row.

## Install

```bash
pnpm add @bonv/beacon-parser
# or: npm install @bonv/beacon-parser
```

## Usage

```ts
import { parseHit } from "@bonv/beacon-parser";

const hit = parseHit({
  url: "https://metrics.example.com/b/ss/examplecompanyprod/1/H29-9f8e7d6c5b4a" +
    "?pageName=homepage&g=https%3A%2F%2Fwww.example.com%2Fhome&v1=fake-evar-1&c1=fake-prop-1&events=event1"
});

if (hit.kind === "appmeasurement") {
  console.log(hit.pageName);   // "homepage"
  console.log(hit.eVars["1"]); // "fake-evar-1"
}
```

`parseHit` never throws. Unrecognized input returns `{ kind: "unknown", reason, raw }`.
Works identically in Node and the browser.

### Diffing two hit sets (migration parity)

```ts
import { diffAdobeHits } from "@bonv/beacon-parser";

const diff = diffAdobeHits(hitsFromOldImplementation, hitsFromNewImplementation);
console.log(diff.missingEvents);  // event ids present before, gone after
console.log(diff.changedEvars);   // [{ index, before, after, pageName }, ...]
```

Useful when migrating tags between vendors (Tealium, Ensighten, Launch) or
generations (AppMeasurement -> Web SDK): run the same user flow against both
implementations, capture both hit sets, and see exactly what changed instead
of eyeballing two debugger sessions side by side. Matching is by `pageName`
then position within each page — best-effort, not exact; see the full repo
README for the matching strategy. eVar/prop comparison only happens between
two AppMeasurement hits — Web SDK carries no numbered eVar/prop on the wire.

## Limitations

- **Client-side only.** Decodes what a browser *sent*; does not verify what
  appears in Adobe Analytics/Customer Journey Analytics reports.
- **Validated on synthetic and public-site fixtures, not a live Adobe property.**
- Unknown/malformed fields are always preserved under `raw`/`unknown`, never
  silently dropped.

## License

Apache-2.0
