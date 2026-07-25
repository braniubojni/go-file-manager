import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { BASE_URL, CONFIG_DIR, HOME_DIR, REPO_ROOT, SERVER_PORT } from "./paths";

const startScript = path.join(__dirname, "scripts", "prepare-and-start.sh");

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  // Prepare before webServer (Playwright still may start webServer first in some versions;
  // start script re-runs prepare idempotently).
  globalSetup: path.join(__dirname, "global-setup.ts"),
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `bash "${startScript}"`,
    url: `${BASE_URL}/health`,
    timeout: 180_000,
    reuseExistingServer: false,
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      HOME: HOME_DIR,
      GFM_CONFIG_DIR: CONFIG_DIR,
      WAILS_SERVER_HOST: "127.0.0.1",
      WAILS_SERVER_PORT: String(SERVER_PORT),
    },
  },
});
