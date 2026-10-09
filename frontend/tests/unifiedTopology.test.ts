import { describe, expect, it } from "vitest";
import type { GraphSnapshotResponse, NodePayload, RouteSnapshotItemResponse } from "../src/api/contracts";
import { adaptTopologyStage } from "../src/features/topology/unified/TopologyStageAdapter";
import { applyLayeredCoordinates, deterministicLayeredLayout, topologyLayer } from "../src/features/topology/unified/topologyLayout";

const nodes: NodePayload[] = [
  { id: "lunar_orbiter", type: "orbiter", role: "lunar_relay_satellite" },
  { id: "lander_main_hub", type: "main_hub", role: "primary_surface_gateway" },
  { id: "relay_backup_1", type: "surface_relay", role: "backup_relay" },
  { id: "rover_1", type: "rover", role: "mobile_user" },
  { id: "ground_station", type: "ground", role: "earth_ground_station" }
];

const links = [
  { id: "surface", source: "rover_1", target: "lander_main_hub", kind: "local", bandwidth_mbps: 10, delay_ms: 5, packet_loss_rate: 0, availability: 1 },
  { id: "uplink", source: "lander_main_hub", target: "lunar_orbiter", kind: "surface_to_orbit", bandwidth_mbps: 10, delay_ms: 50, packet_loss_rate: 0, availability: 1 },
  { id: "downlink", source: "lunar_orbiter", target: "ground_station", kind: "orbit_to_ground", bandwidth_mbps: 10, delay_ms: 1000, packet_loss_rate: 0, availability: 1 }
];

const route: RouteSnapshotItemResponse = {
  service_id: "control_command",
  source: "ground_station",
  target: "rover_1",
  path: ["ground_station", "lunar_orbiter", "lander_main_hub", "rover_1"],
  valid: true,
  route_source: "nominal_computed",
  notes: ""
};

describe("统一月面网络拓扑", () => {
  it("将节点放入正确的空间层级且自动布局确定", () => {
    expect(topologyLayer(nodes[0])).toBe("orbit");
    expect(topologyLayer(nodes[1])).toBe("surface_backbone");
    expect(topologyLayer(nodes[3])).toBe("surface_mission");
    expect(topologyLayer(nodes[4])).toBe("earth");
    expect([...deterministicLayeredLayout(nodes)]).toEqual([...deterministicLayeredLayout(nodes)]);
  });

  it("不同页面和阶段保持相同节点坐标", () => {
    const positioned = applyLayeredCoordinates(nodes);
    const service = adaptTopologyStage({ projectNodes: positioned, projectLinks: links, stage: "service", selectedRoute: route });
    const nominal = adaptTopologyStage({ projectNodes: positioned, projectLinks: links, stage: "nominal", selectedRoute: route });
    expect(positionMap(service.nodes)).toEqual(positionMap(nominal.nodes));
  });

  it("故障计划不提前失效，实际故障阶段才显示失效", () => {
    const snapshot = makeSnapshot(false);
    const plan = adaptTopologyStage({ projectNodes: nodes, projectLinks: links, snapshot, stage: "fault_plan", highlightedNodeIds: ["lander_main_hub"] });
    const faulted = adaptTopologyStage({ projectNodes: nodes, projectLinks: links, snapshot, stage: "before_healing" });
    expect(plan.nodes.find((node) => node.id === "lander_main_hub")?.data.visualState).toBe("target");
    expect(faulted.nodes.find((node) => node.id === "lander_main_hub")?.data.visualState).toBe("failed");
  });

  it("第六步不显示恢复路径，第七步显示恢复路径且主故障仍失效", () => {
    const snapshot = makeSnapshot(false);
    const step6 = adaptTopologyStage({ projectNodes: nodes, projectLinks: links, snapshot, stage: "healing_executed", selectedRoute: route });
    const step7 = adaptTopologyStage({ projectNodes: nodes, projectLinks: links, snapshot, stage: "after_healing", selectedRoute: route });
    expect(step6.edges.some((edge) => edge.data?.visualState === "recovered")).toBe(false);
    expect(step7.edges.some((edge) => edge.data?.visualState === "recovered")).toBe(true);
    expect(step7.nodes.find((node) => node.id === "lander_main_hub")?.data.visualState).toBe("failed");
  });
});

function makeSnapshot(mainHubActive: boolean): GraphSnapshotResponse {
  return {
    stage: "before_healing",
    summary: {},
    nodes: nodes.map((node) => ({ ...node, active: node.id === "lander_main_hub" ? mainHubActive : true })),
    links: links.map((link) => ({ ...link, active: mainHubActive || !["surface", "uplink"].includes(String(link.id)) })),
    routes: {}
  };
}

function positionMap(flowNodes: ReturnType<typeof adaptTopologyStage>["nodes"]) {
  return Object.fromEntries(flowNodes.map((node) => [node.id, node.position]));
}
