import { HIT_EVENT, getCapturedHits, clearCapturedHits } from "./interceptor.js";
import { renderKindBadge, renderHit } from "./hit-render.js";

export function mountInspector(container) {
  render();
  window.addEventListener(HIT_EVENT, render);

  const clearBtn = container.querySelector("[data-inspector-clear]");
  clearBtn?.addEventListener("click", () => {
    clearCapturedHits();
    render();
  });

  function render() {
    const list = container.querySelector("[data-inspector-list]");
    if (!list) return;

    const hits = getCapturedHits();
    if (hits.length === 0) {
      list.innerHTML = '<div class="empty-state">No hits captured yet -- try an action on the shop.</div>';
      return;
    }

    list.innerHTML = hits
      .map(
        (hit, index) => `
          <div class="hit-entry">
            <div class="hit-entry-bar">
              <span class="hit-entry-index">#${index + 1}</span>
              ${renderKindBadge(hit.kind)}
            </div>
            <pre class="hit-entry-body">${renderHit(hit)}</pre>
          </div>
        `
      )
      .reverse()
      .join("");
  }
}
