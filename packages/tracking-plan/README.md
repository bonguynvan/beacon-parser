# @bonv/tracking-plan

> Independent project. Not affiliated with, endorsed by, or sponsored by
> Adobe. Adobe and Adobe Analytics are trademarks of their respective owners.

Define an Adobe Analytics tracking plan as a plain TypeScript object and
validate captured hits against it — full autocomplete and type-checking
while authoring, no YAML/JSON schema to maintain. Built on
[`@bonv/beacon-parser`](../beacon-parser); works with hits captured any way,
including [`@bonv/beacon-playwright`](../beacon-playwright)'s
`captureAdobeHits()`.

Want to see what a hit actually looks like before writing a plan against
it? Paste one into the ["Decode a hit" tab](https://lab.averosi.com/?tab=decode)
of the [learning lab](https://lab.averosi.com).

## Install

```bash
pnpm add @bonv/tracking-plan
```

## Usage

```ts
import { definePlan, validate } from "@bonv/tracking-plan";

const plan = definePlan({
  name: "checkout flow",
  events: [
    {
      name: "purchase",
      match: (hit) => hit.kind === "appmeasurement" && hit.events.some((e) => e.id === "purchase"),
      eVars: { "12": { oneOf: ["checkout"] } },
      events: ["purchase"]
    }
  ]
});

expect(validate(hits, plan).passed).toBe(true);
```

That's the whole example — under 10 lines once imports are excluded.

## `definePlan(plan)`

Identity function that exists purely so the plan literal gets `TrackingPlan`
type-checking and editor autocomplete without writing out the type by hand.

## `validate(hits, plan, options?)`

For every `EventPlan` in `plan.events`, finds each hit `match()` accepts and
checks it against the declared `eVars`/`props`/`events`/`contextData`. An
event with zero matching hits is reported as `missing-hit`, distinct from a
matching hit with a field problem.

```ts
interface EventPlan {
  name: string;
  match: (hit: AdobeHit) => boolean;
  eVars?: Record<string, FieldRule>;       // keyed "1".."250"
  props?: Record<string, FieldRule>;       // keyed "1".."75"
  events?: string[];                       // required Adobe event ids
  contextData?: Record<string, FieldRule>; // dot-path keys, checked on both generations
}

interface FieldRule {
  required?: boolean; // defaults true
  oneOf?: string[];   // allowed literal values
  matches?: RegExp;
}
```

`eVars`/`props` rules run against both generations: AppMeasurement's
`eVars`/`props`, and Web SDK's `data.__adobe.analytics.eVarN`/`propN`. A Web
SDK eVar set through XDM or `contextData` instead is mapped server-side (in
the datastream config), so an `eVars` rule for it reports `missing-field` —
write a `contextData` rule for that key. `contextData` rules run on both
generations: AppMeasurement's top-level `contextData` and Web SDK's
`__adobe.analytics.contextData`, merged across every event in the hit.

Pass `{ strict: true }` to also flag any captured hit that matched no
`EventPlan` at all, useful for catching an unexpected extra hit a flow
shouldn't be firing.

```ts
interface ValidateResult {
  passed: boolean;
  issues: PlanIssue[];
  unmatchedHits: AdobeHit[]; // only populated when options.strict is true
}
```

## Limitations

Same as beacon-parser: client-side only. A plan validates what a browser
*sent*, not what ends up in an Adobe report — server-side processing
(VISTA rules, processing rules, classifications) is invisible to it.
