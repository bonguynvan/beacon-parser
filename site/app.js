import { parseHit } from "./beacon-parser.js";

const EXAMPLES = [
  {
    label: "AppMeasurement · pageview",
    url:
      "https://metrics.example.com/b/ss/examplecompanyprod/1/H29-9f8e7d6c5b4a" +
      "?pageName=homepage&g=https%3A%2F%2Fwww.example.com%2Fhome&r=https%3A%2F%2Fwww.google.com%2F" +
      "&v1=fake-evar-1&c1=fake-prop-1&events=event1&mid=00000000000000000000000000000000",
    method: "GET",
    body: ""
  },
  {
    label: "AppMeasurement · link tracking (pe=lnk_o)",
    url:
      "https://metrics.example.com/b/ss/examplecompanyprod/1/H29-4d5e6f7a8b9c" +
      "?pageName=product-detail&pe=lnk_o&pev1=https%3A%2F%2Fwww.example.com%2Fdownload" +
      "&pev2=download-brochure&events=event2&mid=22222222222222222222222222222222",
    method: "GET",
    body: ""
  },
  {
    label: "AppMeasurement · products + serialization",
    url:
      "https://metrics.example.com/b/ss/examplecompanyprod/1/H29-3c4d5e6f7a8b" +
      "?pageName=cart&events=scAdd&products=Widgets%3BFake%20Widget%20A%3B2%3B39.99" +
      "%3Bevent1%7Cevent2%3D1%3Bevar5%3Dfake-merch-5%2CGadgets%3BFake%20Gadget%20B%3B1%3B19.99" +
      "%3Bevent1%3Bevar5%3Dfake-merch-5b%7Cevar10%3Dfake-merch-10",
    method: "GET",
    body: ""
  },
  {
    label: "Web SDK · pageview interact",
    url: "https://edge.adobedc.net/ee/v1/interact?configId=fake-datastream-id-1111&requestId=req-0001",
    method: "POST",
    body: JSON.stringify(
      {
        events: [
          {
            xdm: {
              eventType: "web.webpagedetails.pageViews",
              timestamp: "2024-01-01T00:00:00.000Z",
              web: { webPageDetails: { pageViews: { value: 1 }, name: "homepage" } }
            },
            data: {
              __adobe: {
                analytics: {
                  pageName: "homepage",
                  events: ["event1"],
                  contextData: { "a.pageType": "home" }
                }
              }
            }
          }
        ]
      },
      null,
      2
    )
  },
  {
    label: "Unrecognized URL",
    url: "https://example.com/some/other/path?foo=bar",
    method: "GET",
    body: ""
  }
];

const els = {
  url: document.getElementById("url"),
  method: document.getElementById("method"),
  body: document.getElementById("body"),
  examples: document.getElementById("examples"),
  parseBtn: document.getElementById("parseBtn"),
  output: document.getElementById("output"),
  kindBadge: document.getElementById("kindBadge")
};

for (const example of EXAMPLES) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = example.label;
  btn.addEventListener("click", () => {
    els.url.value = example.url;
    els.method.value = example.method;
    els.body.value = example.body;
    runParse();
  });
  els.examples.appendChild(btn);
}

els.parseBtn.addEventListener("click", runParse);

function runParse() {
  const url = els.url.value.trim();
  const method = els.method.value;
  const body = els.body.value.trim();

  if (!url) {
    els.output.innerHTML = '<span class="placeholder">Enter a URL first.</span>';
    els.kindBadge.innerHTML = "";
    return;
  }

  const input = { url, method };
  if (body) input.body = body;

  let result;
  try {
    result = parseHit(input);
  } catch (error) {
    // parseHit is documented to never throw; if it somehow does, surface it
    // plainly rather than pretending the demo crashed silently.
    els.output.textContent = "parseHit() threw unexpectedly:\n" + String(error);
    els.kindBadge.innerHTML = "";
    return;
  }

  els.kindBadge.innerHTML = renderKindBadge(result.kind);
  els.output.innerHTML = syntaxHighlight(JSON.stringify(result, null, 2));
}

function renderKindBadge(kind) {
  return `<span class="kind-badge kind-${kind}"><span class="dot"></span>${kind}</span>`;
}

function syntaxHighlight(json) {
  const escaped = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "jn";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "jk" : "js";
      } else if (/true|false/.test(match)) {
        cls = "jb";
      } else if (/null/.test(match)) {
        cls = "jl";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

// Load the first example on page open so the demo isn't blank.
const first = EXAMPLES[0];
els.url.value = first.url;
els.method.value = first.method;
els.body.value = first.body;
runParse();
