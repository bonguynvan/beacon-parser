import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
  clean: true
});
