import { describe, expect, it } from "vitest";
import type { RouteSnapshotItemResponse, ServicePayload } from "../src/api/contracts";
import { applyRouteHighlight, edgeKeysForPath } from "../src/features/routing/pathHighlight";
import { evaluateQosPrecheck } from "../src/features/routing/qosPrecheck";
import { formatSimulationNumber } from "../src/features/simulation/formatters";
import type { TopologyFlowEdge, TopologyFlowNode } from "../src/types/topology";

describe("route highlighting", () => {
  it("highlights A-B-C edges including reversed edge storage", () => {
    const keys = edgeKeysForPath(["A", "B", "C"]);
    expect(keys.has("A::B")).toBe(true);
    expect(keys.has("B::C")).toBe(true);

    const nodes = ["A", "B", "C", "D"].map((id) => node(id));
    const edges = [edge("e1", "B", "A"), edge("e2", "C", "B"), edge("e3", "C", "D")];
    const highlighted = applyRouteHighlight(nodes, edges, route(["A", "B", "C"], true));
    expect(highlighted.edges.find((item) => item.id === "e1")?.animated).toBe(true);
    expect(highlighted.edges.find((item) => item.id === "e2")?.animated).toBe(true);
    expect(highlighted.edges.find((item) => item.id === "e3")?.style?.opacity).toBe(0.22);
  });

  it("does not highlight invalid routes", () => {
    const highlighted = applyRouteHighlight([node("A")], [edge("e1", "A", "B")], route([], false));
    expect(highlighted.edges[0].animated).toBeUndefined();
  });
});

describe("simulation number formatting", () => {
  it("formats finite, null, infinity, and nan values", () => {
    expect(formatSimulationNumber(1.23456, 2)).toBe("1.23");
    expect(formatSimulationNumber(null)).toBe("-");
    expect(formatSimulationNumber({ value: null, value_status: "positive_infinity" })).toBe("∞");
    expect(formatSimulationNumber({ value: null, value_status: "negative_infinity" })).toBe("-∞");
    expect(formatSimulationNumber({ value: null, value_status: "nan" })).toBe("无法计算");
  });
});

describe("QoS precheck", () => {
  const service: ServicePayload = {
    id: "svc",
    source: "A",
    target: "B",
    priority: 1,
    required_bandwidth_mbps: 4,
    max_delay_ms: 100,
    max_loss_rate: 0.01,
    min_success_rate: 0.98,
    max_interruption_s: 1,
    degraded_bandwidth_mbps: 2
  };

  it("passes bandwidth, delay, loss, and success-rate checks", () => {
    const result = evaluateQosPrecheck(service, {
      ...route(["A", "B"], true),
      bottleneck_bandwidth_mbps: 10,
      total_delay_ms: 20,
      packet_loss_rate: 0.001
    });
    expect(result.passed).toBe(true);
    expect(result.items.find((item) => item.key === "interruption")?.detail).toContain("后续");
  });

  it("fails bandwidth, delay, and loss checks", () => {
    const result = evaluateQosPrecheck(service, {
      ...route(["A", "B"], true),
      bottleneck_bandwidth_mbps: 1,
      total_delay_ms: 200,
      packet_loss_rate: 0.2
    });
    expect(result.passed).toBe(false);
    expect(result.failedCount).toBeGreaterThanOrEqual(3);
  });

  it("reports unknown when a hard QoS metric is missing", () => {
    const result = evaluateQosPrecheck(service, {
      ...route(["A", "B"], true),
      bottleneck_bandwidth_mbps: null,
      total_delay_ms: 20,
      packet_loss_rate: 0.001
    });
    expect(result.passed).toBe(false);
    expect(result.overallStatus).toBe("unknown");
    expect(result.failedCount).toBe(0);
    expect(result.unknownCount).toBeGreaterThan(0);
  });

  it("keeps failed status ahead of unknown metrics", () => {
    const result = evaluateQosPrecheck(service, {
      ...route(["A", "B"], true),
      bottleneck_bandwidth_mbps: null,
      total_delay_ms: 200,
      packet_loss_rate: 0.001
    });
    expect(result.passed).toBe(false);
    expect(result.overallStatus).toBe("fail");
    expect(result.failedCount).toBeGreaterThan(0);
    expect(result.unknownCount).toBeGreaterThan(0);
  });
});

function node(id: string): TopologyFlowNode {
  return { id, position: { x: 0, y: 0 }, data: { label: id, payload: { id, type: "terminal", role: "test" } } };
}

function edge(id: string, source: string, target: string): TopologyFlowEdge {
  return {
    id,
    source,
    target,
    data: {
      label: id,
      payload: {
        id,
        source,
        target,
        kind: "local",
        bandwidth_mbps: 1,
        delay_ms: 1,
        packet_loss_rate: 0,
        availability: 1
      }
    }
  };
}

function route(path: string[], valid: boolean): RouteSnapshotItemResponse {
  return {
    service_id: "svc",
    source: "A",
    target: "C",
    path,
    valid,
    route_source: "nominal_computed",
    notes: valid ? "" : "no active path"
  };
}
