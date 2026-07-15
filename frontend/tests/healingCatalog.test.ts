import { describe, expect, it } from "vitest";
import { HEALING_STRATEGY_IDS, OFFLINE_HEALING_CATALOG, healingCatalogItems, healingPreconditionHint, normalizeHealingEnabled } from "../src/features/healing/healingCatalog";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("healing catalog", () => {
  it("keeps the five implemented strategies in stable order", () => {
    expect(healingCatalogItems().map((item) => item.id)).toEqual([...HEALING_STRATEGY_IDS]);
    expect(OFFLINE_HEALING_CATALOG.every((item) => item.implementation_status === "implemented")).toBe(true);
    expect(OFFLINE_HEALING_CATALOG.find((item) => item.id === "reroute_backup_path")?.execution_step).toBe(7);
    expect(OFFLINE_HEALING_CATALOG.filter((item) => item.strategy_category === "non_routing")).toHaveLength(4);
  });

  it("normalizes enabled strategy ids by catalog order and drops unknown ids", () => {
    expect(normalizeHealingEnabled(["service_degradation", "unknown", "service_degradation", "reroute_backup_path"])).toEqual([
      "reroute_backup_path",
      "service_degradation"
    ]);
  });

  it("reports precondition hints from scenario services without claiming success", () => {
    const scenario = defaultLikeScenario();
    scenario.services[0] = { ...scenario.services[0], id: "hd_video", degraded_bandwidth_mbps: 2, required_bandwidth_mbps: 6 };
    expect(healingPreconditionHint("service_degradation", scenario)).toContain("hd_video");
    expect(healingPreconditionHint("reroute_backup_path", scenario)).toContain("第 7 步");
  });
});
