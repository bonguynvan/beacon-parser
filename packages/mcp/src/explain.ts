import type { AppMeasurementHit, ParsedHit, WebSdkAnalyticsBlock, WebSdkHit } from "@bonv/beacon-parser";

export interface ExplainedField {
  field: string;
  value: unknown;
  /** Paraphrased meaning -- never Adobe's own doc text. */
  meaning: string;
  /** Adobe Experience League page the meaning was verified against. */
  source?: string;
}

export interface Explanation {
  kind: ParsedHit["kind"];
  summary: string;
  fields: ExplainedField[];
  /** What this tool cannot tell you about the hit. Always present. */
  caveats: string[];
}

const DOCS = {
  queryParams: "https://experienceleague.adobe.com/en/docs/analytics/implementation/validate/query-parameters",
  pageName: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/pagename",
  pageURL: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/pageurl",
  referrer: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/referrer",
  events: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/events-overview",
  serialization: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/events/event-serialization",
  products: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/products",
  customLink: "https://experienceleague.adobe.com/en/docs/analytics/components/dimensions/custom-link",
  evar: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/evar",
  prop: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/prop",
  list: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/list",
  hier: "https://experienceleague.adobe.com/en/docs/analytics/implementation/vars/page-vars/hier",
  dataObject: "https://experienceleague.adobe.com/en/docs/analytics/implementation/aep-edge/data-var-mapping"
} as const;

const CLIENT_SIDE_CAVEAT =
  "This is what the browser sent, not what appears in Adobe reports: processing rules, VISTA, classifications and report-suite configuration are invisible from the wire.";

const LINK_TYPES = { o: "custom link", d: "download link", e: "exit link" } as const;

export function explainHit(hit: ParsedHit): Explanation {
  if (hit.kind === "appmeasurement") return explainAppMeasurement(hit);
  if (hit.kind === "websdk") return explainWebSdk(hit);
  return {
    kind: "unknown",
    summary: `Not recognized as an AppMeasurement or Web SDK hit: ${hit.reason}.`,
    fields: [],
    caveats: [
      "Detection is by URL/body shape, not hostname, so first-party CNAME hosts are fine -- but this request matched neither shape.",
      CLIENT_SIDE_CAVEAT
    ]
  };
}

function explainAppMeasurement(hit: AppMeasurementHit): Explanation {
  const fields: ExplainedField[] = [];
  const add = (field: string, value: unknown, meaning: string, source?: string): void => {
    fields.push({ field, value, meaning, ...(source ? { source } : {}) });
  };

  if (hit.reportSuiteId) {
    add("reportSuiteId", hit.reportSuiteId, "Report suite the hit is addressed to (from the /b/ss/{rsid} path, or an rsid override).", DOCS.queryParams);
  }
  if (hit.pageName) add("pageName", hit.pageName, "Page name.", DOCS.pageName);
  if (hit.pageURL) add("pageURL", hit.pageURL, "Current page URL (wire key g).", DOCS.pageURL);
  if (hit.referrer) add("referrer", hit.referrer, "Referring URL (wire key r).", DOCS.referrer);
  if (hit.visitorId) add("visitorId", hit.visitorId, "Experience Cloud visitor ID (wire key mid).", DOCS.queryParams);

  if (hit.linkTrackingType) {
    add("linkTrackingType", hit.linkTrackingType, `Link-tracking hit, type: ${LINK_TYPES[hit.linkTrackingType]} (pe=lnk_${hit.linkTrackingType}). Not a page view.`, DOCS.customLink);
    if (hit.linkName) add("linkName", hit.linkName, "Link name (pev2).", DOCS.customLink);
    if (hit.linkURL) add("linkURL", hit.linkURL, "Link URL (pev1).", DOCS.customLink);
  }

  for (const event of hit.events) {
    const detail =
      event.serializationId !== undefined
        ? `serialization (dedup) id "${event.serializationId}" -- the same id is counted once`
        : event.value !== undefined
          ? `numeric value ${event.value}`
          : "counted once";
    add(`event: ${event.id}`, event, `Success event "${event.id}", ${detail}.`, event.serializationId !== undefined ? DOCS.serialization : DOCS.events);
  }

  for (const [n, value] of Object.entries(hit.eVars)) {
    add(`eVar${n}`, value, `eVar ${n} (wire key v${n}). The wire carries only the slot number and value; what it represents is configured per report suite.`, DOCS.evar);
  }
  for (const [n, value] of Object.entries(hit.props)) {
    add(`prop${n}`, value, `Prop ${n} (wire key c${n}). What it represents is configured per report suite.`, DOCS.prop);
  }
  for (const [n, values] of Object.entries(hit.lists)) {
    add(`list${n}`, values, `List variable ${n} (wire key l${n}). Split on comma by default; the real delimiter is configured per report suite and list.`, DOCS.list);
  }
  for (const [n, value] of Object.entries(hit.hierarchies)) {
    add(`hier${n}`, value, `Hierarchy ${n}. Retired by Adobe but still sent by older implementations.`, DOCS.hier);
  }
  if (hit.products.length > 0) {
    add("products", hit.products, "Product entries: category;name;quantity;price;events;merchandising eVars.", DOCS.products);
  }
  if (Object.keys(hit.contextData).length > 0) {
    add("contextData", hit.contextData, "Context data key/value pairs (wire keys c.<key>), dot-nested. Becomes reportable only if a processing rule maps it -- not visible here.");
  }

  const caveats = [
    "Numbered eVars/props are just slots on the wire; this tool cannot say what business meaning a report suite gave them.",
    CLIENT_SIDE_CAVEAT
  ];
  const unknownKeys = Object.keys(hit.unknown);
  if (unknownKeys.length > 0) {
    caveats.unshift(`Parameters seen but not modeled (kept under raw/unknown, not interpreted): ${unknownKeys.join(", ")}.`);
  }

  const subject = hit.linkTrackingType
    ? `link-tracking hit (${LINK_TYPES[hit.linkTrackingType]}${hit.linkName ? ` "${hit.linkName}"` : ""})`
    : `page view${hit.pageName ? ` of "${hit.pageName}"` : ""}`;
  const counts = [
    hit.events.length ? `${hit.events.length} event(s)` : "",
    Object.keys(hit.eVars).length ? `${Object.keys(hit.eVars).length} eVar(s)` : "",
    Object.keys(hit.props).length ? `${Object.keys(hit.props).length} prop(s)` : ""
  ].filter(Boolean);

  return {
    kind: "appmeasurement",
    summary: `AppMeasurement ${subject}${counts.length ? ` carrying ${counts.join(", ")}` : ""}.`,
    fields,
    caveats
  };
}

function explainWebSdk(hit: WebSdkHit): Explanation {
  const fields: ExplainedField[] = [];
  const add = (field: string, value: unknown, meaning: string, source?: string): void => {
    fields.push({ field, value, meaning, ...(source ? { source } : {}) });
  };

  add("endpoint", hit.endpoint, "Edge Network endpoint: interact returns a response, collect is fire-and-forget.");
  if (hit.datastreamId) add("datastreamId", hit.datastreamId, "Datastream (config) id the event is routed through; the datastream config decides what reaches Analytics.");
  if (hit.orgId) add("orgId", hit.orgId, "Experience Cloud organization id.");

  const caveats: string[] = [];

  hit.events.forEach((event, i) => {
    const prefix = `events[${i}]`;
    const eventType = event.xdm["eventType"];
    if (typeof eventType === "string") add(`${prefix}.xdm.eventType`, eventType, "XDM event type describing what happened.");

    const analytics = event.analytics;
    if (!analytics) {
      caveats.push(`${prefix} has no data.__adobe.analytics block: any Analytics variables for it come from XDM field mapping in the datastream, which is not visible on the wire.`);
      return;
    }
    explainAnalyticsBlock(prefix, analytics, add);
  });

  caveats.push(
    "eVars/props only appear here when set on data.__adobe.analytics. A value sent through XDM or contextData is mapped to an eVar/prop server-side (datastream config) -- the wire doesn't say which.",
    CLIENT_SIDE_CAVEAT
  );

  const withAnalytics = hit.events.filter((e) => e.analytics).length;
  return {
    kind: "websdk",
    summary: `Web SDK ${hit.endpoint} request with ${hit.events.length} event(s), ${withAnalytics} carrying a data.__adobe.analytics block.`,
    fields,
    caveats
  };
}

function explainAnalyticsBlock(
  prefix: string,
  analytics: WebSdkAnalyticsBlock,
  add: (field: string, value: unknown, meaning: string, source?: string) => void
): void {
  const path = `${prefix}.data.__adobe.analytics`;
  if (analytics.pageName) add(`${path}.pageName`, analytics.pageName, "Page name.", DOCS.dataObject);
  if (analytics.pageURL) add(`${path}.pageURL`, analytics.pageURL, "Page URL (also accepted as g).", DOCS.dataObject);
  if (analytics.events?.length) add(`${path}.events`, analytics.events, "Success events, in the same token syntax as AppMeasurement (=value, :serialization id).", DOCS.dataObject);
  for (const [n, value] of Object.entries(analytics.eVars ?? {})) {
    add(`${path}.eVar${n}`, value, `eVar ${n}, set directly (Adobe's recommended path). What it represents is configured per report suite.`, DOCS.dataObject);
  }
  for (const [n, value] of Object.entries(analytics.props ?? {})) {
    add(`${path}.prop${n}`, value, `Prop ${n}, set directly. What it represents is configured per report suite.`, DOCS.dataObject);
  }
  if (analytics.linkType) {
    add(`${path}.linkType`, analytics.linkType, `Link type: ${LINK_TYPES[analytics.linkType]}.`, DOCS.dataObject);
  }
  if (analytics.linkName) add(`${path}.linkName`, analytics.linkName, "Link name.", DOCS.dataObject);
  if (analytics.linkURL) add(`${path}.linkURL`, analytics.linkURL, "Link URL.", DOCS.dataObject);
  if (analytics.contextData && Object.keys(analytics.contextData).length > 0) {
    add(`${path}.contextData`, analytics.contextData, "Context data. Whether a key becomes an eVar/prop is decided by the datastream/processing config -- not visible here.", DOCS.dataObject);
  }
}
