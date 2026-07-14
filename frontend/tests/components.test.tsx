import { beforeEach, describe, expect, it, vi } from "vitest";
import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { NodePalette } from "../src/features/topology/NodePalette";
import { PropertyPanel } from "../src/features/topology/PropertyPanel";
import { ValidationPanel } from "../src/features/topology/ValidationPanel";
import { ServiceRoutingPage } from "../src/pages/ServiceRoutingPage";
import { SimulationRunPage } from "../src/pages/SimulationRunPage";
import { useProjectStore } from "../src/stores/projectStore";
import { useServiceRoutingStore } from "../src/stores/serviceRoutingStore";
import { useTopologyEditorStore } from "../src/stores/topologyEditorStore";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

const NOT_VALIDATED = "\u672a\u9a8c\u8bc1";
const VALIDATION_FAILED = "\u9a8c\u8bc1\u5931\u8d25";
const BUILT = "\u5df2\u6784\u5efa";
const CALCULATED = "\u5df2\u8ba1\u7b97";
const COMPLETED = "\u5df2\u5b8c\u6210";
const INJECTED = "\u5df2\u6ce8\u5165";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("component rendering", () => {
  it("renders the node palette", () => {
    renderWithProviders(<NodePalette />);
    expect(screen.getByText("节点组件库")).toBeInTheDocument();
  });

  it("renders node properties when a node is selected", () => {
    useTopologyEditorStore.setState({
      nodes: [{ id: "n1", position: { x: 0, y: 0 }, data: { payload: { id: "n1", type: "ground", role: "r" }, label: "n1" } }],
      edges: [],
      selected: { kind: "node", id: "n1" },
      past: [],
      future: []
    });
    renderWithProviders(<PropertyPanel />);
    expect(screen.getByText("节点属性")).toBeInTheDocument();
  });

  it("renders link properties when a link is selected", () => {
    useTopologyEditorStore.setState({
      nodes: [],
      edges: [
        {
          id: "e1",
          source: "a",
          target: "b",
          data: {
            payload: { id: "e1", source: "a", target: "b", kind: "local", bandwidth_mbps: 1, delay_ms: 1, packet_loss_rate: 0, availability: 1 },
            label: "local"
          }
        }
      ],
      selected: { kind: "edge", id: "e1" },
      past: [],
      future: []
    });
    renderWithProviders(<PropertyPanel />);
    expect(screen.getByText("链路属性")).toBeInTheDocument();
  });

  it("renders validation errors and warnings", () => {
    useProjectStore.setState({
      validationStatus: VALIDATION_FAILED,
      validationResult: {
        valid: false,
        errors: [{ field: "links.0.source", message: "unknown source node" }],
        warnings: [{ field: "faults.schedule.0.target", message: "special target" }],
        summary: { node_count: 1, link_count: 1, service_count: 0, fault_count: 1, indicator_count: 0 }
      }
    });
    renderWithProviders(<ValidationPanel validating={false} onValidate={() => undefined} />);
    expect(screen.getByText("错误列表")).toBeInTheDocument();
    expect(screen.getByText("警告列表")).toBeInTheDocument();
  });

  it("renders route details with node names and raw ids", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ status: "ok", application: "test", version: "0" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    const project = useProjectStore.getState().createProject("routing display", "");
    const scenario = withNamedRouteNodes(defaultLikeScenario());
    useProjectStore.setState({
      draftProject: { ...project, scenario },
      activeProjectId: project.projectId,
      validationStatus: NOT_VALIDATED,
      validationResult: null
    });
    useServiceRoutingStore.setState({
      runtimeProjectId: project.projectId,
      sessionId: "session-1",
      backendTopologyStatus: BUILT,
      routeStatus: CALCULATED,
      topologySnapshot: { stage: "routed", summary: {}, nodes: [], links: [], routes: {} },
      routes: {
        service_1: {
          service_id: "service_1",
          source: "ground_station",
          target: "lunar_orbiter",
          path: ["ground_station", "lunar_orbiter"],
          valid: true,
          route_source: "nominal_computed",
          notes: "",
          bottleneck_bandwidth_mbps: 10,
          total_delay_ms: 20,
          packet_loss_rate: 0.00001,
          availability: 0.999
        }
      },
      selectedServiceId: "service_1",
      routingStrategy: "shortest_delay",
      error: null
    });

    renderWithProviders(<ServiceRoutingPage />);

    expect(screen.getAllByText("地面站（ground_station）").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/地面站（ground_station） -> 月轨中继器（lunar_orbiter）/).length).toBeGreaterThan(0);
  });

  it("renders the staged simulation page with fault plan and snapshot-mode notice", async () => {
    stubCatalogFetch();
    const project = useProjectStore.getState().createProject("simulation page", "");
    useProjectStore.setState({
      draftProject: { ...project, scenario: defaultLikeScenario() },
      activeProjectId: project.projectId,
      validationStatus: NOT_VALIDATED,
      validationResult: null
    });
    useServiceRoutingStore.setState({ runtimeProjectId: project.projectId, selectedServiceId: "service_1" });

    renderWithProviders(<SimulationRunPage />);

    expect(await screen.findByText(/阶段快照模式/)).toBeInTheDocument();
    expect(screen.getByText("③ 运行正常状态")).toBeInTheDocument();
    expect(screen.getByText("故障计划")).toBeInTheDocument();
  });

  it("opens the normal-fault comparison tab when results are completed", async () => {
    seedCompletedSimulationPage();
    renderWithProviders(<SimulationRunPage />);

    fireEvent.click(await screen.findByText("正常—故障对比"));

    expect(screen.getByText("故障影响总览")).toBeInTheDocument();
    expect(screen.getByText("传播真阳性数 (propagation_true_positive_count)")).toBeInTheDocument();
    expect(screen.getAllByText("service_unreachable").length).toBeGreaterThan(0);
  });

  it("shows topology, fault selection, and complete service result fields", async () => {
    seedCompletedSimulationPage();
    renderWithProviders(<SimulationRunPage />);

    expect(await screen.findByText("正常拓扑快照")).toBeInTheDocument();
    expect(screen.getAllByText("可用率").length).toBeGreaterThan(0);
    expect(screen.getAllByText("中断时间").length).toBeGreaterThan(0);
    expect(screen.getAllByText("路由来源").length).toBeGreaterThan(0);
    expect(screen.getAllByText("失败原因").length).toBeGreaterThan(0);
    expect(screen.getAllByText("备注").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByText("F1")[0]);
    expect(screen.getByText("选中故障属性")).toBeInTheDocument();
    expect(screen.getByText("严重度表示故障强度，不是发生概率。")).toBeInTheDocument();

    fireEvent.click(screen.getByText("故障后、自愈前"));
    expect(screen.getByText("故障后、自愈前拓扑快照")).toBeInTheDocument();
    expect(screen.getByText("失效节点/链路")).toBeInTheDocument();
  });
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ConfigProvider locale={zhCN}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

function withNamedRouteNodes(scenario: ReturnType<typeof defaultLikeScenario>) {
  return {
    ...scenario,
    nodes: scenario.nodes.map((node) => {
      if (node.id === "node_1") return { ...node, id: "ground_station", name: "地面站" };
      if (node.id === "node_2") return { ...node, id: "lunar_orbiter", name: "月轨中继器" };
      return node;
    }),
    links: scenario.links.map((link) => ({
      ...link,
      source: link.source === "node_1" ? "ground_station" : link.source === "node_2" ? "lunar_orbiter" : link.source,
      target: link.target === "node_1" ? "ground_station" : link.target === "node_2" ? "lunar_orbiter" : link.target
    })),
    services: scenario.services.map((service, index) =>
      index === 0 ? { ...service, source: "ground_station", target: "lunar_orbiter" } : service
    )
  };
}

function stubCatalogFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          node_types: [],
          link_types: [],
          fault_modes: [
            {
              id: "main_hub_failure",
              code: "main_hub_failure",
              display_name_zh: "主枢纽失效",
              description_zh: "关闭目标节点",
              target_scope: "node",
              implementation_status: "implemented",
              implemented_effect: "target node disabled"
            },
            {
              id: "link_outage",
              code: "link_outage",
              display_name_zh: "链路中断",
              description_zh: "关闭目标链路",
              target_scope: "link",
              implementation_status: "implemented",
              implemented_effect: "target link disabled"
            }
          ],
          healing_strategies: [],
          routing_strategies: [],
          simulation_steps: []
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
  );
}

function seedCompletedSimulationPage() {
  stubCatalogFetch();
  const project = useProjectStore.getState().createProject("simulation completed", "");
  const scenario = defaultLikeScenario();
  useProjectStore.setState({
    draftProject: { ...project, scenario },
    activeProjectId: project.projectId,
    validationStatus: NOT_VALIDATED,
    validationResult: null
  });
  useServiceRoutingStore.setState({
    runtimeProjectId: project.projectId,
    sessionId: "session-1",
    backendTopologyStatus: BUILT,
    routeStatus: CALCULATED,
    nominalStatus: COMPLETED,
    faultInjectionStatus: INJECTED,
    faultImpactStatus: COMPLETED,
    nominalTopology: graphSnapshotFromScenario("nominal", scenario),
    nominalRoutes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], true) },
    nominalServices: [serviceResult("nominal")],
    nominalMetrics: [{ phase: "nominal", layer: "network", metric: "availability", value: 0.999 }],
    physicalModelValidation: [
      {
        model: "rf_lifetime",
        predicted_value: 10,
        reference_value: 10,
        error_pct: 0,
        target_error_pct: 5,
        passed: true,
        reference_source: "test",
        verification_method: "unit"
      }
    ],
    physicalModelMetrics: { rf_lifetime_prediction_error_pct: 0, dust_gain_loss_quantification_error_pct: 0 },
    faultRecords: [
      {
        fault_id: "F1",
        fault_type: "main_hub_failure",
        target: "node_1",
        start_s: 10,
        duration_s: 20,
        severity: 0.8,
        applied_effect: "primary hub disabled; backup paths remain available for rerouting"
      }
    ],
    faultedTopology: graphSnapshotFromScenario("before_healing", scenario, true),
    faultedRoutes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], false) },
    beforeHealingServices: [serviceResult("before_healing")],
    beforeHealingMetrics: [{ phase: "before_healing", layer: "network", metric: "availability", value: 0 }],
    faultImpact: faultImpactSummary(),
    selectedStage: "nominal",
    selectedServiceId: "service_1",
    selectedFaultId: "F1",
    selectedNodeIds: [],
    selectedLinkIds: [],
    error: null
  });
}

function graphSnapshotFromScenario(stage: string, scenario: ReturnType<typeof defaultLikeScenario>, faulted = false) {
  return {
    stage,
    summary: {
      node_count: scenario.nodes.length,
      edge_count: scenario.links.length,
      active_node_count: faulted ? scenario.nodes.length - 1 : scenario.nodes.length,
      active_edge_count: faulted ? scenario.links.length - 1 : scenario.links.length
    },
    nodes: scenario.nodes.map((node, index) => ({
      ...node,
      position_x: index * 100,
      position_y: index % 2 === 0 ? 0 : 100,
      active: faulted && node.id === "node_1" ? false : node.active
    })),
    links: scenario.links.map((link, index) => ({
      ...link,
      id: link.id ?? `link_${index + 1}`,
      active: faulted && index === 0 ? false : link.active,
      availability: faulted && index === 1 ? 0.5 : link.availability
    })),
    routes: {}
  };
}

function routeSnapshot(serviceId: string, path: string[], valid: boolean) {
  return {
    service_id: serviceId,
    source: "node_1",
    target: "node_2",
    path,
    valid,
    route_source: valid ? "nominal_computed" : "inherited_nominal",
    notes: valid ? "" : "no active path",
    bottleneck_bandwidth_mbps: valid ? 10 : null,
    total_delay_ms: valid ? 10 : null,
    packet_loss_rate: valid ? 0.001 : null,
    availability: valid ? 0.999 : null,
    handover_disturbance_ms: valid ? 0 : null
  };
}

function serviceResult(phase: string) {
  return {
    phase,
    service_id: "service_1",
    source: "node_1",
    target: "node_2",
    path: "node_1 -> node_2",
    reachable: phase === "nominal",
    demand_mbps: 1,
    throughput_mbps: phase === "nominal" ? 1 : 0,
    end_to_end_delay_ms: phase === "nominal" ? 10 : { value: null, value_status: "positive_infinity" as const },
    packet_loss_rate: phase === "nominal" ? 0.001 : 1,
    availability: phase === "nominal" ? 0.999 : 0,
    success_rate: phase === "nominal" ? 0.998 : 0,
    interruption_s: phase === "nominal" ? 0 : 120,
    degraded: phase !== "nominal",
    route_valid: phase === "nominal",
    route_source: phase === "nominal" ? "nominal_computed" : "inherited_nominal",
    failure_reason: phase === "nominal" ? "" : "inactive node",
    notes: phase === "nominal" ? "" : "unreachable"
  };
}

function faultImpactSummary() {
  return {
    affected_node_ids: ["node_1"],
    failed_link_ids: ["link_1"],
    degraded_link_ids: ["link_2"],
    invalid_service_ids: ["service_1"],
    unreachable_service_ids: ["service_1"],
    qos_degraded_service_ids: ["service_1"],
    metric_deltas: [{ layer: "network", metric: "availability", nominal_value: 0.999, before_healing_value: 0, delta: -0.999 }],
    propagation_predictions: [
      {
        root_fault: "F1",
        predicted_effect: "service_unreachable",
        predicted_layer: "service",
        predicted_probability: 1,
        predicted_delay_ms: 0,
        propagation_path: "fault -> network -> service",
        confidence: 1
      }
    ],
    observed_impacts: [
      {
        observed_effect: "service_unreachable",
        observed_layer: "service",
        source: "service_results",
        observed_delay_ms: 0,
        evidence: "service_1 unreachable"
      }
    ],
    propagation_comparison: [
      {
        predicted_effect: "service_unreachable",
        observed: true,
        true_positive: true,
        false_positive: false,
        false_negative: false,
        predicted_delay_ms: 0,
        observed_delay_ms: 0,
        delay_error_pct: 0
      }
    ],
    propagation_metrics: {
      cascading_fault_prediction_accuracy: 1,
      fault_propagation_delay_error_pct: 0,
      propagation_true_positive_count: 1,
      propagation_false_positive_count: 0,
      propagation_false_negative_count: 0
    },
    summary: { node_count: 12, edge_count: 20, active_node_count: 11, active_edge_count: 16 }
  };
}
