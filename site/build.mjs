import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../packages/beacon-parser/dist/index.js");
const dest = path.join(here, "beacon-parser.js");

// Strip the sourceMappingURL comment: we don't ship dist/index.js.map
// alongside the renamed file, so a stale reference would just 404.
const contents = readFileSync(src, "utf-8").replace(/\n?\/\/# sourceMappingURL=.*$/, "");
writeFileSync(dest, contents);

console.log(`site/build.mjs: copied ${src} -> ${dest}`);
