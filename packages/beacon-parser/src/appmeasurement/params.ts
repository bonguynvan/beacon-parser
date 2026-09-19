/** Matches props: c1..c75. */
export const PROP_RE = /^c(\d{1,2})$/;
/** Matches eVars: v1..v250. */
export const EVAR_RE = /^v(\d{1,3})$/;
/** Matches hierarchies: h1..h5. */
export const HIER_RE = /^h([1-5])$/;
/** Matches lists: list1..list3. */
export const LIST_RE = /^list([1-3])$/;

export function propIndex(key: string): string | null {
  const digits = PROP_RE.exec(key)?.[1];
  if (!digits) return null;
  const n = Number(digits);
  return n >= 1 && n <= 75 ? digits : null;
}

export function eVarIndex(key: string): string | null {
  const digits = EVAR_RE.exec(key)?.[1];
  if (!digits) return null;
  const n = Number(digits);
  return n >= 1 && n <= 250 ? digits : null;
}

export function hierIndex(key: string): string | null {
  const match = HIER_RE.exec(key);
  return match?.[1] ?? null;
}

export function listIndex(key: string): string | null {
  const match = LIST_RE.exec(key);
  return match?.[1] ?? null;
}

/**
 * Params consumed by dedicated fields on AppMeasurementHit, so they are
 * excluded from `unknown` even though they aren't props/eVars/etc.
 */
export const KNOWN_SCALAR_PARAMS = new Set([
  "pageName",
  "g",
  "r",
  "pe",
  "pev1",
  "pev2",
  "mid",
  "events",
  "products",
  "rsid"
]);
