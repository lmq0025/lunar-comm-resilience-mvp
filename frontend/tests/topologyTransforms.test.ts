import { describe, expect, it } from "vitest";
import { editorStateToScenario, projectToEditorState } from "../src/utils/topologyTransforms";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("拓扑转换函数", () => {
  it("ScenarioPayload 与 React Flow 往返时保留坐标和链路字段", () => {
    const scenario = defaultLikeScenario();
    scenario.nodes[0].position_x = 11;
    scenario.nodes[0].position_y = 22;
    const editorState = projectToEditorState(scenario);
    editorState.nodes[0].position = { x: 33, y: 44 };
    const nextScenario = editorStateToScenario(scenario, editorState);
    expect(nextScenario.nodes[0].position_x).toBe(33);
    expect(nextScenario.nodes[0].position_y).toBe(44);
    expect(nextScenario.links[0].bandwidth_mbps).toBe(10);
    expect(nextScenario.services).toHaveLength(4);
    expect(nextScenario.faults.schedule).toHaveLength(4);
    expect(nextScenario.healing.enabled).toHaveLength(5);
    expect(nextScenario.technical_indicators).toHaveLength(14);
  });
});
