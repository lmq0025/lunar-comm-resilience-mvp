import { afterEach, describe, expect, it, vi } from "vitest";
import { getCatalogs } from "../src/api/catalogs";
import { requestJson } from "../src/api/client";
import { getHealth } from "../src/api/health";
import { validateScenario } from "../src/api/scenarios";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("API 客户端", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("请求 health", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ status: "ok", application: "app", version: "0.2.0" })));
    await expect(getHealth()).resolves.toMatchObject({ status: "ok" });
  });

  it("请求 catalogs", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ node_types: [], link_types: [], fault_modes: [], healing_strategies: [], routing_strategies: [], simulation_steps: [] })));
    await expect(getCatalogs()).resolves.toMatchObject({ node_types: [] });
  });

  it("请求 scenario validate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ valid: true, errors: [], warnings: [], summary: {} })));
    await expect(validateScenario(defaultLikeScenario())).resolves.toMatchObject({ valid: true });
  });

  it("处理 422 错误", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ detail: [] }, 422)));
    await expect(requestJson("/bad")).rejects.toMatchObject({ body: { code: "VALIDATION_ERROR" } });
  });

  it("处理后端离线", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(requestJson("/health")).rejects.toMatchObject({ body: { code: "NETWORK_ERROR" } });
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
