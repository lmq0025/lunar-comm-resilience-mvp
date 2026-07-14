import { beforeEach, describe, expect, it } from "vitest";
import type { LinkPayload } from "../src/api/contracts";
import { useProjectStore } from "../src/stores/projectStore";
import { useServiceRoutingStore } from "../src/stores/serviceRoutingStore";
import { useTopologyEditorStore } from "../src/stores/topologyEditorStore";

const NOT_VALIDATED = "\u672a\u9a8c\u8bc1";
const NOT_BUILT = "\u672a\u6784\u5efa";
const BUILT = "\u5df2\u6784\u5efa";
const EXPIRED = "\u5df2\u8fc7\u671f";
const NOT_CALCULATED = "\u672a\u8ba1\u7b97";
const CALCULATED = "\u5df2\u8ba1\u7b97";
const NOT_RUN = "\u672a\u8fd0\u884c";
const NOT_INJECTED = "\u672a\u6ce8\u5165";
const NOT_ANALYZED = "\u672a\u5206\u6790";

describe("topology editor state", () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
      draftProject: null,
      dirty: false,
      validationStatus: NOT_VALIDATED,
      validationResult: null
    });
    useProjectStore.getState().createProject("topology test", "");
    useTopologyEditorStore.setState({ nodes: [], edges: [], selected: null, past: [], future: [], dragStartSnapshot: null });
    useServiceRoutingStore.setState({
      runtimeProjectId: null,
      sessionId: null,
      backendTopologyStatus: NOT_BUILT,
      routeStatus: NOT_CALCULATED,
      nominalStatus: NOT_RUN,
      faultInjectionStatus: NOT_INJECTED,
      faultImpactStatus: NOT_ANALYZED,
      topologySnapshot: null,
      routes: {},
      nominalTopology: null,
      nominalRoutes: {},
      nominalServices: [],
      nominalMetrics: [],
      physicalModelValidation: [],
      physicalModelMetrics: null,
      faultRecords: [],
      faultedRoutes: {},
      faultedTopology: null,
      beforeHealingServices: [],
      beforeHealingMetrics: [],
      faultImpact: null,
      selectedStage: "nominal",
      selectedServiceId: null,
      routingStrategy: "shortest_delay",
      error: null,
      lastInvalidatedAt: null,
      lastInvalidationReason: null,
      operationSeq: 0
    });
  });

  it("adds, moves, edits, duplicates, and deletes nodes", () => {
    useTopologyEditorStore.getState().addNode("ground", "ground_station", { x: 10, y: 20 });
    expect(useTopologyEditorStore.getState().nodes).toHaveLength(1);

    const id = useTopologyEditorStore.getState().nodes[0].id;
    useTopologyEditorStore.getState().beginNodeDrag();
    useTopologyEditorStore.getState().finishNodeDrag(id, { x: 40, y: 80 });
    expect(useProjectStore.getState().draftProject?.scenario.nodes[0].position_x).toBe(40);

    useTopologyEditorStore.getState().updateNode(id, { id, type: "ground", role: "renamed", name: "\u5730\u9762\u7ad9" });
    expect(useTopologyEditorStore.getState().nodes[0].data.payload.role).toBe("renamed");

    useTopologyEditorStore.getState().selectElement({ kind: "node", id });
    useTopologyEditorStore.getState().duplicateSelectedNode();
    expect(useTopologyEditorStore.getState().nodes).toHaveLength(2);

    useTopologyEditorStore.getState().deleteSelected();
    expect(useTopologyEditorStore.getState().nodes).toHaveLength(1);
  });

  it("rejects self-loop and duplicate links, and deleting a node removes related links", () => {
    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 0, y: 0 });
    useTopologyEditorStore.getState().addNode("orbiter", "orbiter", { x: 100, y: 0 });
    const [first, second] = useTopologyEditorStore.getState().nodes;

    expect(useTopologyEditorStore.getState().addLink(linkPayload(first.id, first.id))).toBe(false);
    expect(useTopologyEditorStore.getState().addLink(linkPayload(first.id, second.id))).toBe(true);
    expect(useTopologyEditorStore.getState().addLink(linkPayload(second.id, first.id))).toBe(false);

    useTopologyEditorStore.getState().selectElement({ kind: "node", id: first.id });
    useTopologyEditorStore.getState().deleteSelected();
    expect(useTopologyEditorStore.getState().edges).toHaveLength(0);
  });

  it("undo after a real drag restores the previous position", () => {
    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 100, y: 100 });
    const id = useTopologyEditorStore.getState().nodes[0].id;
    useTopologyEditorStore.getState().beginNodeDrag();
    useTopologyEditorStore.getState().finishNodeDrag(id, { x: 300, y: 200 });

    useTopologyEditorStore.getState().undo();

    expect(useTopologyEditorStore.getState().nodes[0].position).toEqual({ x: 100, y: 100 });
  });

  it("undo and redo restore state, and loading a scenario clears history", () => {
    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 0, y: 0 });
    useTopologyEditorStore.getState().undo();
    expect(useTopologyEditorStore.getState().nodes).toHaveLength(0);

    useTopologyEditorStore.getState().redo();
    expect(useTopologyEditorStore.getState().nodes).toHaveLength(1);

    const scenario = useProjectStore.getState().draftProject?.scenario;
    if (!scenario) throw new Error("missing scenario");
    useTopologyEditorStore.getState().loadScenario(scenario);
    expect(useTopologyEditorStore.getState().past).toHaveLength(0);
  });

  it("uses independent node counters and does not reuse deleted sequence numbers", () => {
    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 0, y: 0 });
    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 10, y: 0 });
    useTopologyEditorStore.getState().addNode("orbiter", "orbiter", { x: 20, y: 0 });
    expect(useTopologyEditorStore.getState().nodes.map((node) => node.id)).toEqual(["ground_1", "ground_2", "orbiter_1"]);

    useTopologyEditorStore.getState().selectElement({ kind: "node", id: "ground_2" });
    useTopologyEditorStore.getState().deleteSelected();
    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 30, y: 0 });
    expect(useTopologyEditorStore.getState().nodes.map((node) => node.id)).toContain("ground_3");
  });

  it("topology edits invalidate stale routing outputs through the shared runtime action", () => {
    useServiceRoutingStore.setState({
      sessionId: "session-1",
      backendTopologyStatus: BUILT,
      routeStatus: CALCULATED,
      topologySnapshot: { stage: "old", summary: {}, nodes: [], links: [], routes: {} },
      routes: {
        service_1: {
          service_id: "service_1",
          source: "ground_1",
          target: "orbiter_1",
          path: ["ground_1", "orbiter_1"],
          valid: true,
          notes: ""
        }
      }
    });

    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 0, y: 0 });

    expect(useServiceRoutingStore.getState().sessionId).toBeNull();
    expect(useServiceRoutingStore.getState().backendTopologyStatus).toBe(EXPIRED);
    expect(useServiceRoutingStore.getState().routeStatus).toBe(EXPIRED);
    expect(useServiceRoutingStore.getState().topologySnapshot).toBeNull();
    expect(useServiceRoutingStore.getState().routes).toEqual({});
    expect(useServiceRoutingStore.getState().lastInvalidationReason).toBe("topology_changed");
  });

  it("moving a node preserves calculated runtime results but changing link delay invalidates them", () => {
    useTopologyEditorStore.getState().addNode("ground", "ground", { x: 0, y: 0 });
    useTopologyEditorStore.getState().addNode("orbiter", "orbiter", { x: 100, y: 0 });
    const [first, second] = useTopologyEditorStore.getState().nodes;
    expect(useTopologyEditorStore.getState().addLink(linkPayload(first.id, second.id))).toBe(true);

    seedCalculatedRuntime(first.id, second.id);
    useTopologyEditorStore.getState().beginNodeDrag();
    useTopologyEditorStore.getState().finishNodeDrag(first.id, { x: 48, y: 72 });

    expect(useServiceRoutingStore.getState().sessionId).toBe("session-1");
    expect(useServiceRoutingStore.getState().routeStatus).toBe(CALCULATED);
    expect(useServiceRoutingStore.getState().routes.service_1.valid).toBe(true);

    const edge = useTopologyEditorStore.getState().edges[0];
    const payload = edge.data?.payload;
    if (!payload) throw new Error("missing edge payload");
    useTopologyEditorStore.getState().updateEdge(edge.id, { ...payload, delay_ms: payload.delay_ms + 5 });

    expect(useServiceRoutingStore.getState().sessionId).toBeNull();
    expect(useServiceRoutingStore.getState().routeStatus).toBe(EXPIRED);
    expect(useServiceRoutingStore.getState().routes).toEqual({});
  });
});

function linkPayload(source: string, target: string): LinkPayload {
  return {
    id: `link__${source}__${target}`,
    source,
    target,
    kind: "local",
    bandwidth_mbps: 10,
    delay_ms: 10,
    packet_loss_rate: 0,
    availability: 1,
    active: true
  };
}

function seedCalculatedRuntime(source: string, target: string): void {
  useServiceRoutingStore.setState({
    sessionId: "session-1",
    backendTopologyStatus: BUILT,
    routeStatus: CALCULATED,
    topologySnapshot: { stage: "old", summary: {}, nodes: [], links: [], routes: {} },
    routes: {
      service_1: {
        service_id: "service_1",
        source,
        target,
        path: [source, target],
        valid: true,
        notes: ""
      }
    }
  });
}
