import { describe, expect, it } from "vitest";
import { parseProjectJson, parseScenarioYaml, stringifyProjectJson, stringifyScenarioYaml } from "../src/utils/importExport";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("导入导出", () => {
  it("YAML 导入导出保留默认场景关键数量", () => {
    const scenario = defaultLikeScenario();
    const parsed = parseScenarioYaml(stringifyScenarioYaml(scenario));
    expect(parsed.nodes).toHaveLength(12);
    expect(parsed.links).toHaveLength(20);
    expect(parsed.services).toHaveLength(4);
    expect(parsed.faults.schedule).toHaveLength(4);
    expect(parsed.technical_indicators).toHaveLength(14);
  });

  it("项目 JSON 导入导出保留项目文档", () => {
    const scenario = defaultLikeScenario();
    const project = {
      schemaVersion: "1.0" as const,
      projectId: "p1",
      name: "项目",
      description: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      scenario,
      editor: {}
    };
    expect(parseProjectJson(stringifyProjectJson(project)).scenario.links).toHaveLength(20);
  });

  it("错误 YAML 会给出提示", () => {
    expect(() => parseScenarioYaml("nodes: [")).toThrow("YAML 解析失败");
  });

  it("不支持的项目版本会给出提示", () => {
    expect(() => parseProjectJson(JSON.stringify({ schemaVersion: "0.1" }))).toThrow("项目格式版本不受支持");
  });
});
