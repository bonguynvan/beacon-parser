import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./exercises",
  fullyParallel: true,
  reporter: "list",
  use: {
    trace: "off"
  }
});
