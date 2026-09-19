import type { AppMeasurementHit, WebSdkHit } from "@bonv/beacon-parser";

type Hit = AppMeasurementHit | WebSdkHit;

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

function pageNameOf(hit: Hit): string | undefined {
  if (hit.kind === "appmeasurement") return hit.pageName;
  for (const event of hit.events) {
    const pageName = event.analytics?.pageName;
    if (typeof pageName === "string") return pageName;
  }
  return undefined;
}

function eventIdsOf(hit: Hit): string[] {
  if (hit.kind === "appmeasurement") return hit.events.map((event) => event.id);

  const ids: string[] = [];
  for (const event of hit.events) {
    if (Array.isArray(event.analytics?.events)) {
      ids.push(...event.analytics.events);
    }
  }
  return ids;
}

function describeHits(hits: Hit[]): string {
  return `Received ${hits.length} hit(s):\n${JSON.stringify(hits, null, 2)}`;
}

export interface ToHaveAdobeHitExpectation {
  kind?: Hit["kind"];
  pageName?: string;
}

export const adobeMatchers = {
  /** Asserts at least one captured hit matches the given kind/pageName. */
  toHaveAdobeHit(hits: Hit[], expected: ToHaveAdobeHitExpectation = {}): MatcherResult {
    const pass = hits.some((hit) => {
      if (expected.kind !== undefined && hit.kind !== expected.kind) return false;
      if (expected.pageName !== undefined && pageNameOf(hit) !== expected.pageName) return false;
      return true;
    });

    return {
      pass,
      message: () =>
        pass
          ? `Expected no hit matching ${JSON.stringify(expected)}, but found one.`
          : `Expected a hit matching ${JSON.stringify(expected)}. ${describeHits(hits)}`
    };
  },

  /**
   * Asserts at least one captured hit fired the given event id. Checks
   * AppMeasurement's events[].id and Web SDK's __adobe.analytics.events[].
   */
  toHaveAdobeEvent(hits: Hit[], eventId: string): MatcherResult {
    const pass = hits.some((hit) => eventIdsOf(hit).includes(eventId));

    return {
      pass,
      message: () =>
        pass
          ? `Expected no hit to include event "${eventId}", but found one.`
          : `Expected a hit to include event "${eventId}". ${describeHits(hits)}`
    };
  },

  /**
   * Asserts at least one AppMeasurement hit has the given eVar value.
   * Always fails to match on Web SDK hits -- there's no numbered eVar on
   * the wire there; that mapping happens server-side, in the datastream.
   */
  toHaveEvar(hits: Hit[], index: number, expected: string): MatcherResult {
    const pass = hits.some(
      (hit) => hit.kind === "appmeasurement" && hit.eVars[String(index)] === expected
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected no AppMeasurement hit to have eVar${index}="${expected}", but found one.`
          : `Expected an AppMeasurement hit with eVar${index}="${expected}". ${describeHits(hits)}`
    };
  },

  /** Asserts at least one AppMeasurement hit has the given prop value. Web SDK hits never match (see toHaveEvar). */
  toHaveProp(hits: Hit[], index: number, expected: string): MatcherResult {
    const pass = hits.some(
      (hit) => hit.kind === "appmeasurement" && hit.props[String(index)] === expected
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected no AppMeasurement hit to have prop${index}="${expected}", but found one.`
          : `Expected an AppMeasurement hit with prop${index}="${expected}". ${describeHits(hits)}`
    };
  }
};
