// Intercepts every transport an Adobe Analytics library might use to send a
// hit, at the JS call site -- never lets a real network request happen.
//
// Why call-site patching instead of a Service Worker: navigator.sendBeacon()
// does not reliably route through a Service Worker's fetch handler across
// browsers, so a SW-only approach would silently miss it for libraries that
// use sendBeacon on page unload. Patching fetch/XHR/Image.src/sendBeacon
// directly guarantees every path is caught, and means no request is ever
// constructed at the network layer at all -- stronger than even pointing at
// a `.invalid` host, since there's nothing for the browser to attempt.
import { detectHitType, parseHit } from "./beacon-parser.js";

export const HIT_EVENT = "lab:hit";

const capturedHits = [];

export function getCapturedHits() {
  return [...capturedHits];
}

export function clearCapturedHits() {
  capturedHits.length = 0;
}

function isAdobeShaped(url) {
  try {
    return detectHitType({ url: String(url) }) !== "unknown";
  } catch {
    return false;
  }
}

function recordHit(url, method, body) {
  const result = parseHit({ url: String(url), method, ...(body !== undefined ? { body: String(body) } : {}) });
  if (result.kind === "unknown") return;

  capturedHits.push(result);
  window.dispatchEvent(new CustomEvent(HIT_EVENT, { detail: result }));
}

function installFetchInterceptor() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : input?.url;
    if (url && isAdobeShaped(url)) {
      const method = (init?.method || "GET").toUpperCase();
      recordHit(url, method, init?.body);
      return Promise.resolve(new Response(JSON.stringify({ handle: [] }), { status: 200 }));
    }
    return originalFetch(input, init);
  };
}

function installSendBeaconInterceptor() {
  if (!navigator.sendBeacon) return;
  const originalSendBeacon = navigator.sendBeacon.bind(navigator);

  navigator.sendBeacon = function (url, data) {
    if (isAdobeShaped(url)) {
      recordHit(url, "POST", data);
      return true;
    }
    return originalSendBeacon(url, data);
  };
}

function installImageInterceptor() {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (!descriptor?.set || !descriptor.get) return;

  Object.defineProperty(HTMLImageElement.prototype, "src", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get() {
      return descriptor.get.call(this);
    },
    set(value) {
      if (isAdobeShaped(value)) {
        recordHit(value, "GET", undefined);
        // AppMeasurement's image beacons only care that onload/onerror
        // eventually fires so the app doesn't think the pixel is stuck --
        // never point the real <img> at the URL, just simulate success.
        setTimeout(() => this.onload?.(new Event("load")), 0);
        return;
      }
      descriptor.set.call(this, value);
    }
  });
}

function installXhrInterceptor() {
  const OriginalXHR = window.XMLHttpRequest;

  window.XMLHttpRequest = function InterceptedXHR() {
    const xhr = new OriginalXHR();
    const originalOpen = xhr.open.bind(xhr);
    const originalSend = xhr.send.bind(xhr);
    let requestUrl;
    let requestMethod;

    xhr.open = function (method, url, ...rest) {
      requestMethod = method;
      requestUrl = url;
      return originalOpen(method, url, ...rest);
    };

    xhr.send = function (body) {
      if (requestUrl && isAdobeShaped(requestUrl)) {
        recordHit(requestUrl, requestMethod, body);
        setTimeout(() => {
          Object.defineProperty(xhr, "readyState", { value: 4, configurable: true });
          Object.defineProperty(xhr, "status", { value: 200, configurable: true });
          Object.defineProperty(xhr, "responseText", { value: "{}", configurable: true });
          xhr.onreadystatechange?.(new Event("readystatechange"));
          xhr.onload?.(new Event("load"));
        }, 0);
        return;
      }
      return originalSend(body);
    };

    return xhr;
  };
}

export function installInterceptors() {
  installFetchInterceptor();
  installSendBeaconInterceptor();
  installImageInterceptor();
  installXhrInterceptor();
}
