import { defineConfig } from "tsup";

// Two entries in one build: the `beacon-qa` bin and a small library entry
// (loadConfig/runFlows) that other packages, like @bonv/beacon-mcp, import.
// The shebang banner applies to both files; it's valid at the top of an ES
// module and harmless in the library one.
export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
  dts: { entry: ["src/index.ts"] },
  sourcemap: true,
  clean: true
});
