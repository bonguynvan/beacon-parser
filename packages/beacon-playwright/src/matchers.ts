import { pageNameOf, eventIdsOf, evarsOf, propsOf } from "@bonv/beacon-parser";
import type { AdobeHit } from "@bonv/beacon-parser";

type Hit = AdobeHit;

interface MatcherResult {
  pass: boolean;
  message: () => string;
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
   * Asserts at least one captured hit has the given eVar value: an
   * AppMeasurement `eVars` entry, or a Web SDK `data.__adobe.analytics.eVarN`.
   * A Web SDK hit that sets the eVar via XDM or context data instead is
   * mapped server-side (in the datastream) and can't match here.
   */
  toHaveEvar(hits: Hit[], index: number, expected: string): MatcherResult {
    const pass = hits.some((hit) => evarsOf(hit)[String(index)] === expected);

    return {
      pass,
      message: () =>
        pass
          ? `Expected no hit to have eVar${index}="${expected}", but found one.`
          : `Expected a hit with eVar${index}="${expected}". ${describeHits(hits)}`
    };
  },

  /** Asserts at least one captured hit has the given prop value. Same coverage as toHaveEvar. */
  toHaveProp(hits: Hit[], index: number, expected: string): MatcherResult {
    const pass = hits.some((hit) => propsOf(hit)[String(index)] === expected);

    return {
      pass,
      message: () =>
        pass
          ? `Expected no hit to have prop${index}="${expected}", but found one.`
          : `Expected a hit with prop${index}="${expected}". ${describeHits(hits)}`
    };
  }
};
