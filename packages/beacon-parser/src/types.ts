// ---- Entry point input ----

export interface HitInput {
  url: string;
  method?: "GET" | "POST";
  body?: string;
}

export type HitType = "appmeasurement" | "websdk" | "unknown";

export interface ParseHitOptions {
  /**
   * Delimiter(s) used to split list1-3 values into arrays. Defaults to ",".
   *
   * AppMeasurement list variables are delimiter-configurable **per list, per
   * report suite** — list1 and list2 on the same report suite can use
   * different delimiters. Pass a single string to apply one delimiter to
   * every list, or an object keyed by the same numeric suffix `lists` uses
   * ("1" | "2" | "3", not "list1") to configure them independently:
   *
   * ```ts
   * parseHit(input, { listDelimiter: "|" });                 // all lists use "|"
   * parseHit(input, { listDelimiter: { "1": ",", "2": "|" } }); // per-list
   * ```
   *
   * A list not present as a key in the object form falls back to ",".
   * Ignored for Web SDK hits. The raw, un-split value is always preserved
   * under `raw` regardless of this option.
   */
  listDelimiter?: string | Partial<Record<"1" | "2" | "3", string>>;
}

// ---- Shared primitives ----

export type UnknownParams = Record<string, string>;

export interface EventEntry {
  /** Event id/name as it appears on the wire, e.g. "event1", "purchase", "scOpen". */
  id: string;
  /** Numeric value, e.g. event1=5.99 -> 5.99. */
  value?: number;
  /** Serialization/dedup id, e.g. event3:abc123 -> "abc123". Mutually exclusive with `value`. */
  serializationId?: string;
}

export interface ProductEntry {
  category?: string;
  name?: string;
  quantity?: number;
  price?: number;
  events: EventEntry[];
  /** Merchandising eVars scoped to this product, keyed by numeric suffix ("1".."250"). */
  eVars: Record<string, string>;
}

/** Nested object built from c.key=value / c.parent.child=value context data pairs. */
export type ContextData = Record<string, unknown>;

// ---- AppMeasurement ----

export interface AppMeasurementHit {
  kind: "appmeasurement";
  reportSuiteId: string | null;
  /** AppMeasurement library version, e.g. "H.29.4". */
  version: string | null;
  /** Request type segment from the URL, e.g. "ss" from /b/ss/{rsid}/{version}/{code}. */
  requestType: string | null;
  pageName?: string;
  /** Page URL ('g'). */
  pageURL?: string;
  /** Referrer URL ('r'). */
  referrer?: string;
  /** Link tracking type from pe=lnk_o|lnk_d|lnk_e, null if not a link-tracking hit. */
  linkTrackingType: "o" | "d" | "e" | null;
  /** Link URL (pev1) when linkTrackingType is set. */
  linkURL?: string;
  /** Link name (pev2) when linkTrackingType is set. */
  linkName?: string;
  /** Experience Cloud ID ('mid'). */
  visitorId?: string;
  events: EventEntry[];
  /** Props c1-c75, keyed by numeric suffix ("1".."75"). */
  props: Record<string, string>;
  /** eVars v1-v250, keyed by numeric suffix ("1".."250"). */
  eVars: Record<string, string>;
  /** Hierarchies h1-h5, keyed by numeric suffix ("1".."5"). */
  hierarchies: Record<string, string>;
  /** Lists list1-3, keyed by numeric suffix ("1".."3"), values comma-split. */
  lists: Record<string, string[]>;
  products: ProductEntry[];
  contextData: ContextData;
  /** Every parsed query/body param, untouched. */
  raw: UnknownParams;
  /** Params seen but not mapped to a known field. */
  unknown: UnknownParams;
}

// ---- Web SDK (Alloy) ----

export interface WebSdkAnalyticsBlock {
  pageName?: string;
  events?: string[];
  contextData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WebSdkEventEntry {
  xdm: Record<string, unknown>;
  data?: Record<string, unknown>;
  /** The __adobe.analytics block, extracted from data/xdm when present. */
  analytics?: WebSdkAnalyticsBlock;
}

export interface WebSdkHit {
  kind: "websdk";
  endpoint: "interact" | "collect" | "unknown";
  /** Datastream/config id, from the 'configId' query param when present. */
  datastreamId?: string;
  orgId?: string;
  events: WebSdkEventEntry[];
  /** Top-level payload.query, if present. */
  query?: Record<string, unknown>;
  /** Top-level payload.meta, if present. */
  meta?: Record<string, unknown>;
  /** Untouched parsed JSON body. */
  raw: unknown;
  /** Unrecognized query-string params on the request URL. */
  unknown: UnknownParams;
}

// ---- Fallback ----

export interface UnknownHit {
  kind: "unknown";
  reason: string;
  raw: HitInput;
}

// ---- Discriminated union ----

export type ParsedHit = AppMeasurementHit | WebSdkHit | UnknownHit;
