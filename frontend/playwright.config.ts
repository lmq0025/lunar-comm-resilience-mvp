import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(frontendRoot, "..");
const apiPort = Number(process.env.LUNAR_E2E_API_PORT ?? "8891");
const frontendPort = Number(process.env.LUNAR_E2E_FRONTEND_PORT ?? "5178");
const appDataDir = path.join(repoRoot, "outputs", "tmp_pytest", "playwright_app_data");

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" }
    }
  ],
  webServer: [
    {
      command: `python -m uvicorn lunar_comm_sim.api.main:app --host 127.0.0.1 --port ${apiPort}`,
      cwd: repoRoot,
      env: {
        ...process.env,
        LUNAR_APP_DATA_DIR: appDataDir,
        LUNAR_AUTH_MODE: "disabled",
        LUNAR_FRONTEND_PORT: String(frontendPort)
      },
      url: `http://127.0.0.1:${apiPort}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000
    },
    {
      command: "npm run dev",
      cwd: frontendRoot,
      env: {
        ...process.env,
        LUNAR_FRONTEND_PORT: String(frontendPort),
        VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}/api/v1`
      },
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      timeout: 60_000
    }
  ]
});
