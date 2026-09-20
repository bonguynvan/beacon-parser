// Cross-platform wrapper for "run every exercise's check against
// solution.html" -- inline `VAR=value cmd` env syntax works in bash but not
// cmd.exe/PowerShell, so a plain Node script (spawning with the env var set
// programmatically) is simpler and more portable than adding a dependency
// like cross-env just for this one case.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["playwright", "test"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, EXERCISE_PAGE: "solution.html" }
});

process.exit(result.status ?? 1);
