import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteSnapshotItemResponse } from "../src/api/contracts";
import { useProjectStore } from "../src/stores/projectStore";
import { synchronizeFaultTypeWhitelist, useServiceRoutingStore } from "../src/stores/serviceRoutingStore";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

const NOT_VALIDATED = "\u672a\u9a8c\u8bc1";
const NOT_BUILT = "\u672a\u6784\u5efa";
const BUILT = "\u5df2\u6784\u5efa";
const EXPIRED = "\u5df2\u8fc7\u671f";
const FAILED = "\u5931\u8d25";
const NOT_CALCULATED = "\u672a\u8ba1\u7b97";
const CALCULATED = "\u5df2\u8ba1\u7b97";
const NOT_RUN = "\u672a\u8fd0\u884c";
const COMPLETED = "\u5df2\u5b8c\u6210";
const NOT_INJECTED = "\u672a\u6ce8\u5165";
const INJECTED = "\u5df2\u6ce8\u5165";
const NOT_ANALYZED = "\u672a\u5206\u6790";

function resetStores() {
  localStorage.clear();
  useProjectStore.setState({
    projects: [],
    activeProjectId: null,
    draftProject: null,
    dirty: false,
    validationStatus: NOT_VALIDATED,
    validationResult: null
  });
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
    selectedFaultId: null,
    selectedNodeIds: [],
    selectedLinkIds: [],
    routingStrategy: "shortest_delay",
    error: null,
    lastInvalidatedAt: null,
    lastInvalidationReason: null,
    operationSeq: 0
  });
  const project = useProjectStore.getState().createProject("test", "");
  useProjectStore.getState().updateDraftScenario(() => defaultLikeScenario());
  return project;
}

describe("service routing store", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetStores();
  });

  it("adds, updates, duplicates, and deletes services without reusing ids", () => {
    const store = useServiceRoutingStore.getState();
    const added = store.addService("control_command");
    expect(added.id).toMatch(/^service_/);
    expect(useProjectStore.getState().dirty).toBe(true);

    store.updateService(added.id, { name: "edited", target: "node_3" });
    const edited = useProjectStore.getState().draftProject?.scenario.services.find((service) => service.id === added.id);
    expect(edited?.name).toBe("edited");
    expect(edited?.target).toBe("node_3");

    const duplicated = store.duplicateService(added.id);
    expect(duplicated?.id).not.toBe(added.id);
    expect(useProjectStore.getState().draftProject?.scenario.services.some((service) => service.id === duplicated?.id)).toBe(true);

    store.deleteService(added.id);
    expect(useProjectStore.getState().draftProject?.scenario.services.some((service) => service.id === added.id)).toBe(false);
  });

  it("rejects identical source and target", () => {
    const service = useServiceRoutingStore.getState().addService("custom");
    expect(() => useServiceRoutingStore.getState().updateService(service.id, { source: "node_1", target: "node_1" })).toThrow(
      "\u6e90\u8282\u70b9\u548c\u76ee\u6807\u8282\u70b9\u4e0d\u80fd\u76f8\u540c"
    );
  });

  it("clears stale routes and snapshots after service edits", () => {
    const route = routeSnapshot("service_1", ["node_1", "node_2"], true);
    useServiceRoutingStore.setState({
      sessionId: "session-1",
      backendTopologyStatus: BUILT,
      routeStatus: CALCULATED,
      topologySnapshot: graphSnapshot("before-edit"),
      routes: { service_1: route }
    });

    const service = useServiceRoutingStore.getState().addService("custom");

    expect(service.id).toBeTruthy();
    expect(useServiceRoutingStore.getState().backendTopologyStatus).toBe(EXPIRED);
    expect(useServiceRoutingStore.getState().routeStatus).toBe(EXPIRED);
    expect(useServiceRoutingStore.getState().sessionId).toBeNull();
    expect(useServiceRoutingStore.getState().topologySnapshot).toBeNull();
    expect(useServiceRoutingStore.getState().routes).toEqual({});
    expect(useServiceRoutingStore.getState().lastInvalidationReason).toBe("service_changed");
  });

  it("preserves runtime while re-entering the same project and resets it when the project changes", () => {
    const projectId = useProjectStore.getState().draftProject?.projectId ?? "project-1";
    useServiceRoutingStore.setState({
      runtimeProjectId: projectId,
      selectedServiceId: "service_1",
      sessionId: "session-1",
      backendTopologyStatus: BUILT,
      routeStatus: CALCULATED,
      topologySnapshot: graphSnapshot("project-1"),
      routes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], true) }
    });

    useServiceRoutingStore.getState().ensureProjectContext(projectId, ["service_1", "service_2"]);

    expect(useServiceRoutingStore.getState().sessionId).toBe("session-1");
    expect(useServiceRoutingStore.getState().routeStatus).toBe(CALCULATED);
    expect(useServiceRoutingStore.getState().routes.service_1.valid).toBe(true);

    useServiceRoutingStore.getState().ensureProjectContext("other-project", ["service_2"]);

    expect(useServiceRoutingStore.getState().runtimeProjectId).toBe("other-project");
    expect(useServiceRoutingStore.getState().selectedServiceId).toBe("service_2");
    expect(useServiceRoutingStore.getState().sessionId).toBeNull();
    expect(useServiceRoutingStore.getState().backendTopologyStatus).toBe(NOT_BUILT);
    expect(useServiceRoutingStore.getState().routeStatus).toBe(NOT_CALCULATED);
    expect(useServiceRoutingStore.getState().topologySnapshot).toBeNull();
    expect(useServiceRoutingStore.getState().routes).toEqual({});
  });

  it("selects the first available service when the current selection no longer exists", () => {
    useServiceRoutingStore.setState({
      runtimeProjectId: "project-1",
      selectedServiceId: "missing-service",
      sessionId: "session-1",
      backendTopologyStatus: BUILT,
      routeStatus: CALCULATED,
      routes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], true) }
    });

    useServiceRoutingStore.getState().ensureProjectContext("project-1", ["service_2"]);
    expect(useServiceRoutingStore.getState().selectedServiceId).toBe("service_2");

    useServiceRoutingStore.getState().ensureProjectContext("project-1", []);
    expect(useServiceRoutingStore.getState().selectedServiceId).toBeNull();
    expect(useServiceRoutingStore.getState().routes.service_1.valid).toBe(true);
  });

  it("calls validate, create session, build topology, and calculate routes in order", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", mockRoutingFetch(calls));

    await useServiceRoutingStore.getState().buildBackendTopology();
    expect(useServiceRoutingStore.getState().backendTopologyStatus).toBe(BUILT);
    expect(useServiceRoutingStore.getState().routes).toEqual({});

    await useServiceRoutingStore.getState().calculateRoutes();

    expect(calls).toEqual(["validate", "create", "build", "routes"]);
    expect(useServiceRoutingStore.getState().routeStatus).toBe(CALCULATED);
    expect(useServiceRoutingStore.getState().routes.service_1.valid).toBe(true);
  });

  it("runs nominal, injects faults, and analyzes impact in order", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", mockRoutingFetch(calls));

    await useServiceRoutingStore.getState().buildBackendTopology();
    await useServiceRoutingStore.getState().calculateRoutes();
    await useServiceRoutingStore.getState().runNominal();
    await useServiceRoutingStore.getState().injectFaults();
    await useServiceRoutingStore.getState().analyzeFaultImpact();

    expect(calls).toEqual(["validate", "create", "build", "routes", "nominal", "faults", "impact"]);
    expect(useServiceRoutingStore.getState().nominalStatus).toBe(COMPLETED);
    expect(useServiceRoutingStore.getState().faultInjectionStatus).toBe(INJECTED);
    expect(useServiceRoutingStore.getState().faultImpactStatus).toBe(COMPLETED);
    expect(useServiceRoutingStore.getState().nominalServices).toHaveLength(1);
    expect(useServiceRoutingStore.getState().faultRecords).toHaveLength(1);
    expect(useServiceRoutingStore.getState().beforeHealingServices).toHaveLength(1);
    expect(useServiceRoutingStore.getState().faultImpact?.propagation_predictions).toHaveLength(1);
  });

  it("manages fault CRUD and invalidates all staged outputs", () => {
    useServiceRoutingStore.setState({
      sessionId: "session-1",
      backendTopologyStatus: BUILT,
      routeStatus: CALCULATED,
      nominalStatus: COMPLETED,
      faultInjectionStatus: INJECTED,
      faultImpactStatus: COMPLETED,
      routes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], true) },
      nominalServices: [serviceResult("nominal")],
      faultRecords: [faultRecord("F-old")],
      beforeHealingServices: [serviceResult("before_healing")],
      faultImpact: faultImpactSummary()
    });

    const added = useServiceRoutingStore.getState().addFault("main_hub_failure");
    expect(added.id).toMatch(/^F/);
    expect(useProjectStore.getState().draftProject?.scenario.faults.enabled).toContain("main_hub_failure");
    expect(useServiceRoutingStore.getState().selectedFaultId).toBe(added.id);
    expect(useServiceRoutingStore.getState().sessionId).toBeNull();
    expect(useServiceRoutingStore.getState().routeStatus).toBe(EXPIRED);
    expect(useServiceRoutingStore.getState().nominalStatus).toBe(EXPIRED);
    expect(useServiceRoutingStore.getState().faultRecords).toEqual([]);

    useServiceRoutingStore.getState().updateFault(added.id, { severity: 0.7, enabled: false });
    const edited = useProjectStore.getState().draftProject?.scenario.faults.schedule.find((fault) => fault.id === added.id);
    expect(edited?.severity).toBe(0.7);
    expect(edited?.enabled).toBe(false);
    expect(useProjectStore.getState().draftProject?.scenario.faults.enabled).toContain("main_hub_failure");

    const duplicated = useServiceRoutingStore.getState().duplicateFault(added.id);
    expect(duplicated?.id).not.toBe(added.id);

    useServiceRoutingStore.getState().deleteFault(added.id);
    expect(useProjectStore.getState().draftProject?.scenario.faults.schedule.some((fault) => fault.id === added.id)).toBe(false);
  });

  it("synchronizes fault type whitelist from the current schedule", () => {
    expect(
      synchronizeFaultTypeWhitelist([
        { id: "F1", type: "main_hub_failure", target: "node_1", start_s: 0, duration_s: 5, severity: 1, enabled: false },
        { id: "F2", type: "link_outage", target: "link_1", start_s: 0, duration_s: 5, severity: 1, enabled: true },
        { id: "F3", type: "main_hub_failure", target: "node_2", start_s: 0, duration_s: 5, severity: 1, enabled: true }
      ])
    ).toEqual(["main_hub_failure", "link_outage"]);

    const added = useServiceRoutingStore.getState().addFault("main_hub_failure");
    useServiceRoutingStore.getState().updateFault(added.id, { type: "link_outage", target: "link_1" });
    expect(useProjectStore.getState().draftProject?.scenario.faults.enabled).toContain("link_outage");

    const schedule = useProjectStore.getState().draftProject?.scenario.faults.schedule ?? [];
    for (const fault of schedule.filter((item) => item.type === "link_outage")) {
      useServiceRoutingStore.getState().deleteFault(fault.id);
    }
    expect(useProjectStore.getState().draftProject?.scenario.faults.enabled).not.toContain("link_outage");
  });

  it("does not create a session when validation fails", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return jsonResponse({ valid: false, errors: [{ field: "services.0.source", message: "unknown source node" }], warnings: [], summary: {} });
      })
    );

    await useServiceRoutingStore.getState().buildBackendTopology();

    expect(calls).toHaveLength(1);
    expect(useServiceRoutingStore.getState().backendTopologyStatus).toBe(FAILED);
    expect(useServiceRoutingStore.getState().sessionId).toBeNull();
    expect(useServiceRoutingStore.getState().routes).toEqual({});
  });

  it("deletes a newly created backend session and clears outputs when topology build fails", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/scenarios/validate")) {
          calls.push("validate");
          return jsonResponse({ valid: true, errors: [], warnings: [], summary: {} });
        }
        if (url.endsWith("/sessions") && init?.method === "POST") {
          calls.push("create");
          return jsonResponse({ session_id: "session-new", current_step: "created", completed_steps: [], next_allowed_step: "build-topology" });
        }
        if (url.endsWith("/steps/build-topology")) {
          calls.push("build-failed");
          return jsonResponse({ error: { code: "BOOM", message: "build failed" } }, 500);
        }
        if (url.endsWith("/sessions/session-new") && init?.method === "DELETE") {
          calls.push("delete-new");
          return jsonResponse({ session_id: "session-new", deleted: true });
        }
        return jsonResponse({ error: { code: "UNEXPECTED", message: url } }, 500);
      })
    );

    await useServiceRoutingStore.getState().buildBackendTopology();

    expect(calls).toEqual(["validate", "create", "build-failed", "delete-new"]);
    expect(useServiceRoutingStore.getState().backendTopologyStatus).toBe(FAILED);
    expect(useServiceRoutingStore.getState().routeStatus).toBe(NOT_CALCULATED);
    expect(useServiceRoutingStore.getState().sessionId).toBeNull();
    expect(useServiceRoutingStore.getState().topologySnapshot).toBeNull();
    expect(useServiceRoutingStore.getState().routes).toEqual({});
  });

  it("clears old route results when route calculation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/steps/calculate-routes")) {
          return jsonResponse({ error: { code: "ROUTE_FAILED", message: "route failed" } }, 500);
        }
        return jsonResponse({ error: { code: "UNEXPECTED", message: url } }, 500);
      })
    );
    useServiceRoutingStore.setState({
      sessionId: "session-1",
      backendTopologyStatus: BUILT,
      routeStatus: CALCULATED,
      topologySnapshot: graphSnapshot("old"),
      routes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], true) }
    });

    await useServiceRoutingStore.getState().calculateRoutes();

    expect(useServiceRoutingStore.getState().sessionId).toBe("session-1");
    expect(useServiceRoutingStore.getState().backendTopologyStatus).toBe(BUILT);
    expect(useServiceRoutingStore.getState().routeStatus).toBe(FAILED);
    expect(useServiceRoutingStore.getState().routes).toEqual({});
    expect(useServiceRoutingStore.getState().error).toBe("route failed");
  });
});

function mockRoutingFetch(calls: string[]) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/scenarios/validate")) {
      calls.push("validate");
      return jsonResponse({ valid: true, errors: [], warnings: [], summary: {} });
    }
    if (url.endsWith("/sessions") && init?.method === "POST") {
      calls.push("create");
      return jsonResponse({ session_id: "session-1", current_step: "created", completed_steps: [], next_allowed_step: "build-topology" });
    }
    if (url.endsWith("/steps/build-topology")) {
      calls.push("build");
      return jsonResponse({
        session_id: "session-1",
        completed_step: "topology_built",
        current_step: "topology_built",
        completed_steps: ["topology_built"],
        next_allowed_step: "calculate-routes",
        step_result: { topology: graphSnapshot("built") }
      });
    }
    if (url.endsWith("/steps/calculate-routes")) {
      calls.push("routes");
      return jsonResponse({
        session_id: "session-1",
        completed_step: "nominal_routes_calculated",
        current_step: "nominal_routes_calculated",
        completed_steps: ["topology_built", "nominal_routes_calculated"],
        next_allowed_step: "run-nominal",
        step_result: {
          topology: graphSnapshot("routed"),
          routes: {
            service_1: routeSnapshot("service_1", ["node_1", "node_2"], true)
          }
        }
      });
    }
    if (url.endsWith("/steps/run-nominal")) {
      calls.push("nominal");
      return jsonResponse({
        session_id: "session-1",
        completed_step: "nominal_simulated",
        current_step: "nominal_simulated",
        completed_steps: ["topology_built", "nominal_routes_calculated", "nominal_simulated"],
        next_allowed_step: "inject-faults",
        step_result: {
          services: [serviceResult("nominal")],
          metrics: [metricRow("nominal")],
          topology: graphSnapshot("nominal"),
          routes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], true) },
          physical_model_validation: [
            {
              model: "rf_lifetime",
              predicted_value: 1,
              reference_value: 1,
              error_pct: 0,
              target_error_pct: 5,
              passed: true,
              reference_source: "test",
              verification_method: "unit"
            }
          ],
          physical_model_metrics: { rf_lifetime_prediction_error_pct: 0, dust_gain_loss_quantification_error_pct: 0 }
        }
      });
    }
    if (url.endsWith("/steps/inject-faults")) {
      calls.push("faults");
      return jsonResponse({
        session_id: "session-1",
        completed_step: "faults_injected",
        current_step: "faults_injected",
        completed_steps: ["topology_built", "nominal_routes_calculated", "nominal_simulated", "faults_injected"],
        next_allowed_step: "analyze-fault-impact",
        step_result: {
          fault_records: [faultRecord("F1")],
          routes: { service_1: routeSnapshot("service_1", ["node_1", "node_2"], false) },
          topology: graphSnapshot("before_healing")
        }
      });
    }
    if (url.endsWith("/steps/analyze-fault-impact")) {
      calls.push("impact");
      return jsonResponse({
        session_id: "session-1",
        completed_step: "fault_impact_analyzed",
        current_step: "fault_impact_analyzed",
        completed_steps: ["topology_built", "nominal_routes_calculated", "nominal_simulated", "faults_injected", "fault_impact_analyzed"],
        next_allowed_step: "execute-healing",
        step_result: {
          services: [serviceResult("before_healing")],
          metrics: [metricRow("before_healing")],
          fault_impact: faultImpactSummary()
        }
      });
    }
    return jsonResponse({ error: { code: "UNEXPECTED", message: url } }, 500);
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function graphSnapshot(stage: string) {
  return {
    stage,
    summary: { node_count: 12, edge_count: 20, active_node_count: 12, active_edge_count: 20 },
    nodes: [],
    links: [],
    routes: {}
  };
}

function routeSnapshot(serviceId: string, path: string[], valid: boolean): RouteSnapshotItemResponse {
  return {
    service_id: serviceId,
    source: "node_1",
    target: "node_2",
    path,
    valid,
    route_source: "nominal_computed",
    notes: valid ? "" : "no active path",
    bottleneck_bandwidth_mbps: valid ? 10 : null,
    total_delay_ms: valid ? 10 : null,
    packet_loss_rate: valid ? 0.00001 : null,
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
    degraded: false,
    route_valid: phase === "nominal",
    route_source: phase === "nominal" ? "nominal_computed" : "inherited_nominal",
    failure_reason: phase === "nominal" ? "" : "inactive node",
    notes: phase === "nominal" ? "" : "unreachable"
  };
}

function metricRow(phase: string) {
  return { phase, layer: "network", metric: "availability", value: phase === "nominal" ? 0.999 : 0 };
}

function faultRecord(faultId: string) {
  return {
    fault_id: faultId,
    fault_type: "main_hub_failure",
    target: "node_1",
    start_s: 10,
    duration_s: 20,
    severity: 0.8,
    applied_effect: "primary hub disabled; backup paths remain available for rerouting"
  };
}

function faultImpactSummary() {
  return {
    affected_node_ids: ["node_1"],
    failed_link_ids: ["link_1"],
    degraded_link_ids: [],
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
