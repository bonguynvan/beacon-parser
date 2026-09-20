import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const parserSrc = path.resolve(here, "../packages/beacon-parser/dist/index.js");
const parserDest = path.join(here, "site/beacon-parser.js");
const contents = readFileSync(parserSrc, "utf-8").replace(/\n?\/\/# sourceMappingURL=.*$/, "");
writeFileSync(parserDest, contents);
console.log(`lab/build.mjs: copied ${parserSrc} -> ${parserDest}`);

const sharedSrc = path.resolve(here, "../shared/hit-render.js");
const sharedDest = path.join(here, "site/hit-render.js");
copyFileSync(sharedSrc, sharedDest);
console.log(`lab/build.mjs: copied ${sharedSrc} -> ${sharedDest}`);
