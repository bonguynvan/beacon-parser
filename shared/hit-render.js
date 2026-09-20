// Shared between site/ (parser playground) and lab/site/ (learning lab) --
// both are independently-deployed static sites, so this file is copied into
// each at build time (see each site's build.mjs) rather than imported across
// origins.

export function renderKindBadge(kind) {
  return `<span class="kind-badge kind-${kind}"><span class="dot"></span>${kind}</span>`;
}

export function syntaxHighlight(json) {
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

export function renderHit(result) {
  return syntaxHighlight(JSON.stringify(result, null, 2));
}
