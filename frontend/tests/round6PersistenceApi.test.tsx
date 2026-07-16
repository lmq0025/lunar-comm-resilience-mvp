import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStepJob, getLatestRun, listRuns, restoreRunSession } from "../src/api/runs";
import { reportClientError } from "../src/api/clientErrors";
import { RunHistoryPage } from "../src/pages/RunHistoryPage";
import { useProjectStore } from "../src/stores/projectStore";
import { useServiceRoutingStore } from "../src/stores/serviceRoutingStore";
import { useUiStore } from "../src/stores/uiStore";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("round 6 persistence api", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls run history, restore, job, and client error endpoints", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${String(input)}`);
      return jsonResponse(endpointPayload(String(input)));
    }));

    await listRuns("project-1");
    await getLatestRun("project-1");
    await restoreRunSession("run-1");
    await createStepJob("run-1", "healing_executed");
    await reportClientError({ message: "boom", context: { view: "test" } });

    expect(calls.some((call) => call.includes("/runs?project_id=project-1"))).toBe(true);
    expect(calls.some((call) => call.includes("/runs/latest?project_id=project-1"))).toBe(true);
    expect(calls.some((call) => call.includes("/runs/run-1/restore-session"))).toBe(true);
    expect(calls.some((call) => call.includes("/runs/run-1/jobs/healing_executed"))).toBe(true);
    expect(calls.some((call) => call.includes("/client-errors"))).toBe(true);
  });

  it("renders run history and restores a persisted session", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => jsonResponse(endpointPayload(String(input)))));
    useProjectStore.setState({
      projects: [],
      activeProjectId: "project-1",
      draftProject: {
        schemaVersion: "1.0",
        projectId: "project-1",
        revision: 2,
        name: "Project",
        description: "",
        createdAt: "2026-07-15T00:00:00Z",
        updatedAt: "2026-07-15T00:00:00Z",
        scenario: defaultLikeScenario(),
        editor: { nodeTypeCounters: {} }
      },
      dirty: false
    });
    useServiceRoutingStore.setState({ sessionId: null, runtimeProjectId: null });
    useUiStore.setState({ activeMenu: "runHistory" });

    render(
      <AntApp>
        <RunHistoryPage />
      </AntApp>
    );

    expect(await screen.findByText("demo_scenario")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /恢复运行/ }));

    await waitFor(() => {
      expect(useServiceRoutingStore.getState().sessionId).toBe("session-1");
      expect(useUiStore.getState().activeMenu).toBe("simulation");
    });
  });

  it("stores step 6 to step 9 results for healing, comparison, and indicators", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => jsonResponse(stepPayload(String(input)))));
    const scenario = defaultLikeScenario();
    useProjectStore.setState({
      projects: [],
      activeProjectId: "project-1",
      draftProject: {
        schemaVersion: "1.0",
        projectId: "project-1",
        revision: 2,
        name: "Project",
        description: "",
        createdAt: "2026-07-15T00:00:00Z",
        updatedAt: "2026-07-15T00:00:00Z",
        scenario,
        editor: { nodeTypeCounters: {} }
      },
      dirty: false
    });
    useServiceRoutingStore.setState({
      sessionId: "session-1",
      faultImpactStatus: "已完成"
    });

    await useServiceRoutingStore.getState().executeHealing();
    expect(useServiceRoutingStore.getState().nonRoutingHealingActions.map((action) => action.strategy)).toEqual([
      "priority_scheduling",
      "service_degradation",
      "store_and_forward",
      "relay_pre_handover"
    ]);
    expect(useServiceRoutingStore.getState().pendingRouteRecalculation).toBe(true);

    await useServiceRoutingStore.getState().recalculateHealedRoutes();
    expect(useServiceRoutingStore.getState().allHealingActions.at(-1)?.strategy).toBe("reroute_backup_path");
    expect(Object.values(useServiceRoutingStore.getState().healedRoutes).every((route) => route.valid)).toBe(true);

    await useServiceRoutingStore.getState().runAfterHealing();
    expect(useServiceRoutingStore.getState().afterHealingServices).toHaveLength(1);
    expect(useServiceRoutingStore.getState().afterHealingMetrics).toHaveLength(1);

    await useServiceRoutingStore.getState().verifyIndicators();
    expect(useServiceRoutingStore.getState().indicatorSummary).toEqual({
      applicableCount: 14,
      passedCount: 14,
      failedCount: 0,
      notApplicableCount: 0
    });
    expect(useServiceRoutingStore.getState().artifacts.map((artifact) => artifact.filename)).toContain("report.md");
  });
});

function endpointPayload(url: string) {
  if (url.includes("/client-errors")) return { recorded: true, request_id: "test" };
  if (url.includes("/jobs/")) {
    return { job_id: "job-1", run_id: "run-1", step_name: "healing_executed", status: "queued", cancellation_requested: false, created_at: "2026-07-15T00:00:00Z" };
  }
  if (url.includes("/restore-session")) {
    return { session: sessionSummary(), run: runSummary() };
  }
  if (url.includes("/runs/latest") || url.endsWith("/runs/run-1")) return runSummary();
  if (url.includes("/runs")) return { runs: [runSummary()] };
  return {};
}

function runSummary() {
  return {
    run_id: "run-1",
    session_id: "session-1",
    project_id: "project-1",
    project_revision: 2,
    owner_user_id: "local_admin",
    scenario_name: "demo_scenario",
    status: "completed",
    current_step: "indicators_verified",
    completed_steps: [
      "topology_built",
      "nominal_routes_calculated",
      "nominal_simulated",
      "faults_injected",
      "fault_impact_analyzed",
      "healing_executed",
      "healed_routes_calculated",
      "after_healing_simulated",
      "indicators_verified"
    ],
    output_dir: "outputs/api_sessions/session-1",
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:01:00Z",
    steps: [],
    artifacts: [{ filename: "report.md", relative_path: "report.md", exists: true, size_bytes: 10 }]
  };
}

function sessionSummary() {
  return {
    session_id: "session-1",
    run_id: "run-1",
    project_id: "project-1",
    project_revision: 2,
    scenario_name: "demo_scenario",
    current_step: "indicators_verified",
    completed_steps: runSummary().completed_steps,
    next_allowed_step: null,
    output_dir: "outputs/api_sessions/session-1"
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stepPayload(url: string) {
  if (url.includes("/execute-healing")) {
    return {
      session_id: "session-1",
      completed_step: "healing_executed",
      current_step: "healing_executed",
      completed_steps: ["topology_built", "nominal_routes_calculated", "nominal_simulated", "faults_injected", "fault_impact_analyzed", "healing_executed"],
      next_allowed_step: "recalculate-routes",
      step_result: {
        healing_actions: ["priority_scheduling", "service_degradation", "store_and_forward", "relay_pre_handover"].map((strategy, index) => healingAction(strategy, index)),
        pending_route_recalculation: true,
        routes: { service_1: route("inherited_nominal", false) },
        topology: topology("after_healing")
      }
    };
  }
  if (url.includes("/recalculate-routes")) {
    const actions = ["priority_scheduling", "service_degradation", "store_and_forward", "relay_pre_handover", "reroute_backup_path"];
    return {
      session_id: "session-1",
      completed_step: "healed_routes_calculated",
      current_step: "healed_routes_calculated",
      completed_steps: [],
      next_allowed_step: "run-after-healing",
      step_result: {
        healing_actions: actions.map((strategy, index) => healingAction(strategy, index)),
        pending_route_recalculation: false,
        routes: { service_1: route("reroute_backup_path", true) },
        topology: topology("after_healing")
      }
    };
  }
  if (url.includes("/run-after-healing")) {
    return {
      session_id: "session-1",
      completed_step: "after_healing_simulated",
      current_step: "after_healing_simulated",
      completed_steps: [],
      next_allowed_step: "verify-indicators",
      step_result: {
        services: [serviceResult()],
        metrics: [{ phase: "after_healing", layer: "service", metric: "success_rate", value: 1 }],
        topology: topology("after_healing"),
        healing_actions: [healingAction("reroute_backup_path", 4)],
        routes: { service_1: route("reroute_backup_path", true) }
      }
    };
  }
  if (url.includes("/verify-indicators")) {
    return {
      session_id: "session-1",
      completed_step: "indicators_verified",
      current_step: "indicators_verified",
      completed_steps: [],
      next_allowed_step: null,
      step_result: {
        indicators: [{ id: "I1", indicator: "availability", layer: "service", metric: "success_rate", operator: ">=", threshold: 0.99, actual: 1, unit: "", applicable: true, status: "passed", not_applicable_reason: "", passed: true, verification_method: "api" }],
        applicable_count: 14,
        passed_count: 14,
        failed_count: 0,
        not_applicable_count: 0,
        artifacts: [{ filename: "report.md", relative_path: "report.md", exists: true, size_bytes: 10 }]
      }
    };
  }
  return { error: { code: "UNEXPECTED", message: url } };
}

function healingAction(strategy: string, index: number) {
  return { time_s: index, strategy, target: "service_1", action: strategy, success: true, measured_response_ms: 10, notes: "" };
}

function route(route_source: string, valid: boolean) {
  return { service_id: "service_1", source: "node_1", target: "node_2", path: valid ? ["node_1", "node_2"] : [], valid, route_source, notes: "" };
}

function topology(stage: string) {
  return { stage, summary: {}, nodes: [], links: [], routes: {} };
}

function serviceResult() {
  return {
    phase: "after_healing",
    service_id: "service_1",
    source: "node_1",
    target: "node_2",
    path: "node_1 -> node_2",
    reachable: true,
    demand_mbps: 1,
    throughput_mbps: 1,
    end_to_end_delay_ms: 10,
    packet_loss_rate: 0,
    availability: 1,
    success_rate: 1,
    interruption_s: 0,
    degraded: false,
    route_valid: true,
    route_source: "reroute_backup_path",
    failure_reason: "",
    notes: ""
  };
}
