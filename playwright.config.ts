import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8402",
    viewport: { width: 1440, height: 1000 },
    locale: "fr-FR",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: "bun run preview --port 8402",
    url: "http://127.0.0.1:8402",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
