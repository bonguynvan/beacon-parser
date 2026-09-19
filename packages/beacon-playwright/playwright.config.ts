import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  fullyParallel: true,
  reporter: "list",
  use: {
    trace: "off"
  }
});
