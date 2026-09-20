const tabButtons = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll("[data-tab-panel]");

function activate(tab) {
  for (const btn of tabButtons) {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  }
  for (const panel of panels) {
    panel.classList.toggle("active", panel.dataset.tabPanel === tab);
  }
}

for (const btn of tabButtons) {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    activate(tab);

    const url = new URL(location.href);
    url.searchParams.set("tab", tab);
    history.replaceState(null, "", url);
  });
}

// Deep link support: https://lab.averosi.com/?tab=decode opens straight to
// the decode panel (used by the old GitHub Pages playground's redirect).
const initialTab = new URLSearchParams(location.search).get("tab");
if (initialTab === "decode") activate("decode");
