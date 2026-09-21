import { eventIdsOf, evarsOf, pageNameOf, propsOf } from "./hit-utils.js";
import type { AdobeHit, ChangedValue, HitDiffEntry, HitDiffResult } from "./types.js";

const NO_PAGE_NAME_KEY = Symbol("no-pageName");

/**
 * Compares two hit sets captured from the same user flow run against an old
 * and a new tag implementation (a vendor migration, or an AppMeasurement ->
 * Web SDK move), and reports what's missing, added, or changed.
 *
 * Matching strategy (best-effort, not exact -- hit counts and order can
 * differ between runs): group hits by pageName, then pair them positionally
 * within each group -- the first "checkout" hit in `before` pairs with the
 * first "checkout" hit in `after`, the second with the second, and so on.
 * Hits with no pageName at all are grouped together and matched
 * positionally as a fallback bucket. Unmatched hits on either side are
 * reported as missing (before-only) or added (after-only).
 *
 * eVar/prop comparison covers AppMeasurement `eVars`/`props` and Web SDK
 * `data.__adobe.analytics.eVarN`/`propN` alike, so a pair spanning
 * generations (kindChanged: true) is compared too. eVars a Web SDK
 * implementation sets through XDM or context data instead are mapped
 * server-side and can't be compared here.
 */
export function diffAdobeHits(before: AdobeHit[], after: AdobeHit[]): HitDiffResult {
  const beforeGroups = groupByPageName(before);
  const afterGroups = groupByPageName(after);

  const entries: HitDiffEntry[] = [];
  for (const key of orderedKeys(before, after)) {
    const beforeGroup = beforeGroups.get(key) ?? [];
    const afterGroup = afterGroups.get(key) ?? [];
    const length = Math.max(beforeGroup.length, afterGroup.length);

    for (let i = 0; i < length; i++) {
      entries.push(diffPair(beforeGroup[i], afterGroup[i]));
    }
  }

  return {
    entries,
    missingEvents: entries.flatMap((entry) => entry.missingEvents),
    addedEvents: entries.flatMap((entry) => entry.addedEvents),
    changedEvars: entries.flatMap((entry) =>
      entry.changedEvars.map((change) => ({ ...change, pageName: entry.pageName }))
    ),
    changedProps: entries.flatMap((entry) =>
      entry.changedProps.map((change) => ({ ...change, pageName: entry.pageName }))
    ),
    missingHits: entries.filter((entry) => entry.before && !entry.after).map((entry) => entry.before as AdobeHit),
    addedHits: entries.filter((entry) => entry.after && !entry.before).map((entry) => entry.after as AdobeHit)
  };
}

function groupByPageName(hits: AdobeHit[]): Map<string | typeof NO_PAGE_NAME_KEY, AdobeHit[]> {
  const groups = new Map<string | typeof NO_PAGE_NAME_KEY, AdobeHit[]>();

  for (const hit of hits) {
    const key = pageNameOf(hit) ?? NO_PAGE_NAME_KEY;
    const group = groups.get(key);
    if (group) {
      group.push(hit);
    } else {
      groups.set(key, [hit]);
    }
  }

  return groups;
}

/** pageName keys in first-appearance order across before then after, deduped. */
function orderedKeys(
  before: AdobeHit[],
  after: AdobeHit[]
): Array<string | typeof NO_PAGE_NAME_KEY> {
  const seen = new Set<string | typeof NO_PAGE_NAME_KEY>();
  const ordered: Array<string | typeof NO_PAGE_NAME_KEY> = [];

  for (const hit of [...before, ...after]) {
    const key = pageNameOf(hit) ?? NO_PAGE_NAME_KEY;
    if (!seen.has(key)) {
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered;
}

function diffPair(before: AdobeHit | undefined, after: AdobeHit | undefined): HitDiffEntry {
  const pageName = (before && pageNameOf(before)) ?? (after && pageNameOf(after)) ?? undefined;
  const kindChanged = before !== undefined && after !== undefined && before.kind !== after.kind;

  const beforeEvents = before ? eventIdsOf(before) : [];
  const afterEvents = after ? eventIdsOf(after) : [];

  return {
    before,
    after,
    pageName,
    kindChanged,
    missingEvents: beforeEvents.filter((id) => !afterEvents.includes(id)),
    addedEvents: afterEvents.filter((id) => !beforeEvents.includes(id)),
    changedEvars: diffNumberedFields(before, after, "eVars"),
    changedProps: diffNumberedFields(before, after, "props")
  };
}

function diffNumberedFields(
  before: AdobeHit | undefined,
  after: AdobeHit | undefined,
  field: "eVars" | "props"
): ChangedValue[] {
  if (!before || !after) return [];

  const read = field === "eVars" ? evarsOf : propsOf;
  const beforeValues = read(before);
  const afterValues = read(after);
  const changes: ChangedValue[] = [];

  const indexes = new Set([...Object.keys(beforeValues), ...Object.keys(afterValues)]);
  for (const index of indexes) {
    const beforeValue = beforeValues[index];
    const afterValue = afterValues[index];
    if (beforeValue !== afterValue) {
      changes.push({ index, before: beforeValue ?? "", after: afterValue ?? "" });
    }
  }

  return changes;
}
