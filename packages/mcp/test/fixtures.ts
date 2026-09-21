import type { HitInput } from "@bonv/beacon-parser";

export const AM_PAGEVIEW: HitInput = {
  url:
    "https://metrics.example.com/b/ss/examplecompanyprod/1/H29-abc123" +
    "?pageName=checkout&events=purchase,event5%3D2.5&v12=checkout-step-2&c3=checkout-flow&zz=mystery"
};

export const AM_LINK: HitInput = {
  url: "https://metrics.example.com/b/ss/examplecompanyprod/1/H29-def456?pe=lnk_o&pev2=place-order&events=event2"
};

export const SDK_DATA_OBJECT: HitInput = {
  url: "https://edge.adobedc.net/ee/v1/interact?configId=fake-datastream-id",
  method: "POST",
  body: JSON.stringify({
    events: [
      {
        xdm: { eventType: "web.webinteraction.linkClicks" },
        data: { __adobe: { analytics: { pageName: "checkout", events: "purchase", eVar12: "checkout-step-2" } } }
      }
    ]
  })
};

export const SDK_XDM_ONLY: HitInput = {
  url: "https://edge.adobedc.net/ee/v1/interact?configId=fake-datastream-id",
  method: "POST",
  body: JSON.stringify({ events: [{ xdm: { eventType: "web.webpagedetails.pageViews" } }] })
};

export const NOT_A_HIT: HitInput = { url: "https://example.com/some/other/path?foo=bar" };
