import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "..", "..");
const scenario = YAML.parse(fs.readFileSync(path.join(repoRoot, "configs", "default_scenario.yaml"), "utf8"));

interface RouteLike {
  route_source?: string;
  valid?: boolean;
}

test("default scenario completes nine backend steps through Chromium", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lunar Communication Resilience Platform")).toBeVisible();

  const apiBase = `http://127.0.0.1:${process.env.LUNAR_E2E_API_PORT ?? "8891"}/api/v1`;
  const result = await page.evaluate(async ({ rawScenario, apiBaseUrl }) => {
    async function post(path: string, body?: unknown) {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`${path} ${response.status}: ${await response.text()}`);
      return response.json();
    }

    const validation = await post("/scenarios/validate", rawScenario);
    const session = await post("/sessions", { scenario: rawScenario });
    const endpoints = [
      "build-topology",
      "calculate-routes",
      "run-nominal",
      "inject-faults",
      "analyze-fault-impact",
      "execute-healing",
      "recalculate-routes",
      "run-after-healing",
      "verify-indicators"
    ];
    const steps: Record<string, unknown> = {};
    for (const endpoint of endpoints) {
      steps[endpoint] = await post(`/sessions/${session.session_id}/steps/${endpoint}`);
    }
    return { validation, session, steps };
  }, { rawScenario: scenario, apiBaseUrl: apiBase });

  expect(result.validation.valid).toBe(true);
  expect(result.steps["execute-healing"].step_result.pending_route_recalculation).toBe(true);
  const step6Routes = Object.values(result.steps["execute-healing"].step_result.routes) as RouteLike[];
  expect(step6Routes.every((route) => route.route_source === "inherited_nominal" && !route.valid)).toBe(true);
  expect(result.steps["recalculate-routes"].step_result.pending_route_recalculation).toBe(false);
  const step7Routes = Object.values(result.steps["recalculate-routes"].step_result.routes) as RouteLike[];
  expect(step7Routes.every((route) => route.route_source === "reroute_backup_path" && route.valid)).toBe(true);
  expect(result.steps["run-after-healing"].step_result.services).toHaveLength(4);
  expect(result.steps["verify-indicators"].step_result.applicable_count).toBe(14);
  expect(result.steps["verify-indicators"].step_result.passed_count).toBe(14);
  expect(result.steps["verify-indicators"].step_result.failed_count).toBe(0);
});
