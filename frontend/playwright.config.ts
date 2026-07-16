import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendRoot, "..");
const port = Number(process.env.LUNAR_E2E_API_PORT ?? "8891");
const appDataDir = path.join(repoRoot, "outputs", "round6_1_playwright_app_data");

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: `python -m uvicorn lunar_comm_sim.api.main:app --host 127.0.0.1 --port ${port}`,
    cwd: repoRoot,
    env: {
      ...process.env,
      LUNAR_APP_DATA_DIR: appDataDir,
      LUNAR_AUTH_MODE: "disabled"
    },
    url: `http://127.0.0.1:${port}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 60_000
  }
});
