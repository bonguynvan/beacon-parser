// A tiny, fake shop. Every user action calls trackIntent() once, with a
// generic description of what happened -- trackIntent() decides how to
// phrase that as either an AppMeasurement hit or a Web SDK event, depending
// on the mode toggle. This mirrors exactly what exercise 2 asks a learner to
// practice: sending the same intent two ways.

const PRODUCTS = [
  { id: "sku-001", name: "Wireless Mouse", category: "Accessories", price: 24.99 },
  { id: "sku-002", name: "Mechanical Keyboard", category: "Accessories", price: 89.0 },
  { id: "sku-003", name: "USB-C Hub", category: "Accessories", price: 34.5 }
];

const FAKE_RSID = "labshopprod";
const FAKE_TRACKING_HOST = "https://fake-metrics.averosi-lab.invalid";
const FAKE_EDGE_HOST = "https://fake-edge.averosi-lab.invalid";
const FAKE_DATASTREAM_ID = "fake-lab-datastream-0000";

let mode = "appmeasurement"; // or "websdk"
const cart = [];

export function setMode(nextMode) {
  mode = nextMode;
}

export function getProducts() {
  return PRODUCTS;
}

export function getCart() {
  return [...cart];
}

/**
 * The one thing every shop interaction calls. `intent` is a plain
 * description of what happened -- trackIntent() is where the "same intent,
 * two implementations" logic lives.
 */
function trackIntent(intent) {
  if (mode === "appmeasurement") {
    trackAppMeasurement(intent);
  } else {
    trackWebSdk(intent);
  }
}

function trackAppMeasurement(intent) {
  const params = new URLSearchParams();
  if (intent.pageName) params.set("pageName", intent.pageName);
  if (intent.events?.length) params.set("events", intent.events.join(","));
  if (intent.eVars) {
    for (const [index, value] of Object.entries(intent.eVars)) params.set(`v${index}`, value);
  }
  if (intent.props) {
    for (const [index, value] of Object.entries(intent.props)) params.set(`c${index}`, value);
  }
  if (intent.linkName) {
    params.set("pe", "lnk_o");
    params.set("pev2", intent.linkName);
  }

  const url = `${FAKE_TRACKING_HOST}/b/ss/${FAKE_RSID}/1/lab-${Date.now()}?${params.toString()}`;
  const img = new Image();
  img.src = url;
}

function trackWebSdk(intent) {
  const url = `${FAKE_EDGE_HOST}/ee/v1/interact?configId=${FAKE_DATASTREAM_ID}`;
  const body = JSON.stringify({
    events: [
      {
        xdm: { eventType: intent.xdmEventType || "web.webinteraction.linkClicks" },
        data: {
          __adobe: {
            analytics: {
              pageName: intent.pageName,
              events: intent.events || [],
              ...(intent.eVars || intent.props
                ? { contextData: buildContextData(intent) }
                : {})
            }
          }
        }
      }
    ]
  });

  fetch(url, { method: "POST", body });
}

function buildContextData(intent) {
  const contextData = {};
  for (const [index, value] of Object.entries(intent.eVars || {})) {
    contextData[`lab.evar${index}`] = value;
  }
  for (const [index, value] of Object.entries(intent.props || {})) {
    contextData[`lab.prop${index}`] = value;
  }
  return contextData;
}

export function viewProduct(product) {
  trackIntent({
    pageName: `product-${product.id}`,
    events: ["event1"],
    eVars: { "1": product.category },
    xdmEventType: "web.webpagedetails.pageViews"
  });
}

export function addToCart(product) {
  cart.push(product);
  trackIntent({
    pageName: `product-${product.id}`,
    events: ["scAdd"],
    eVars: { "1": product.category },
    props: { "3": product.id },
    linkName: `add-to-cart-${product.id}`,
    xdmEventType: "commerce.productListAdds"
  });
}

export function checkout() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  trackIntent({
    pageName: "checkout-confirmation",
    events: ["purchase"],
    eVars: { "2": total.toFixed(2) },
    xdmEventType: "commerce.purchases"
  });
  cart.length = 0;
}
