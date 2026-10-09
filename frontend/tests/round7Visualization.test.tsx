import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FaultImpactSummaryResponse, ServicePayload, ServiceSimulationResultResponse } from "../src/api/contracts";
import { HealingAblationPanel } from "../src/features/results/HealingAblationPanel";
import { PropagationCauseChain } from "../src/features/results/PropagationCauseChain";
import { ThreeStageRecoveryPanel } from "../src/features/results/ThreeStageRecoveryPanel";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Round 7 result visualizations", () => {
  it("uses real stage result props and preserves non-finite delay as unavailable", async () => {
    const service: ServicePayload = {
      id: "science_data",
      source: "science_station",
      target: "ground_station",
      priority: 2,
      required_bandwidth_mbps: 8
    };
    renderUi(
      <ThreeStageRecoveryPanel
        services={[service]}
        nominal={[result("nominal", true, 8, 20)]}
        before={[result("before_healing", false, 0, { value: null, value_status: "positive_infinity" })]}
        after={[result("after_healing", true, 6, 35)]}
      />
    );

    expect(screen.getByText("三阶段韧性恢复对比")).toBeInTheDocument();
    expect(screen.getByText("8 Mbps")).toBeInTheDocument();
    expect(screen.getByText("0 Mbps")).toBeInTheDocument();
    fireEvent.mouseDown(document.querySelector(".chart-toolbar .ant-select-selector") as Element);
    fireEvent.click(await screen.findByText("平均端到端时延"));
    expect(screen.getAllByText("不可计算").length).toBeGreaterThan(0);
  });

  it("loads traceable historical ablation data and does not label it as current run", async () => {
    const referencePath = path.resolve(process.cwd(), "public/assets/healing_ablation_round7.json");
    const dataset = JSON.parse(readFileSync(referencePath, "utf8")) as { source_file: string; source_sha256: string; rows: Array<{ indicator_pass_count: number }> };
    const sourcePath = path.resolve(process.cwd(), "..", dataset.source_file);
    const sourceHash = createHash("sha256").update(readFileSync(sourcePath)).digest("hex").toUpperCase();
    expect(dataset.source_sha256).toBe(sourceHash);
    expect(dataset.rows.map((row) => row.indicator_pass_count)).toEqual([5, 8, 9, 11, 14]);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(dataset), { status: 200 })));
    renderUi(<HealingAblationPanel />);
    expect(await screen.findByText("五级自愈策略消融（历史验证实验）")).toBeInTheDocument();
    expect(screen.getByText(/不是当前九步单场景运行推导值/)).toBeInTheDocument();
    expect(screen.getByText("14/14")).toBeInTheDocument();
  });

  it("maps backend propagation event ids to Chinese and keeps cumulative semantics", () => {
    renderUi(<PropagationCauseChain faultImpact={faultImpact()} />);
    expect(screen.getByText("主通信枢纽失效")).toBeInTheDocument();
    expect(screen.getByText("业务路径失效")).toBeInTheDocument();
    expect(screen.getByText("业务不可达")).toBeInTheDocument();
    expect(screen.getByText(/累计概率 0.82；累计时延 45 ms/)).toBeInTheDocument();
    expect(screen.getByText(/仅在链末端和详情中展示/)).toBeInTheDocument();
  });
});

function renderUi(ui: React.ReactElement) {
  return render(<ConfigProvider locale={zhCN}><AntdApp>{ui}</AntdApp></ConfigProvider>);
}

function result(phase: string, reachable: boolean, throughput: number, delay: ServiceSimulationResultResponse["end_to_end_delay_ms"]): ServiceSimulationResultResponse {
  return {
    phase,
    service_id: "science_data",
    source: "science_station",
    target: "ground_station",
    path: reachable ? "science_station -> ground_station" : "",
    reachable,
    demand_mbps: 8,
    throughput_mbps: throughput,
    end_to_end_delay_ms: delay,
    packet_loss_rate: reachable ? 0.001 : 1,
    availability: reachable ? 0.999 : 0,
    success_rate: reachable ? 0.999 : 0,
    interruption_s: reachable ? 0 : 120,
    degraded: false,
    route_valid: reachable,
    route_source: reachable ? "nominal_computed" : "inherited_nominal",
    failure_reason: reachable ? "" : "route invalid",
    notes: ""
  };
}

function faultImpact(): FaultImpactSummaryResponse {
  return {
    affected_node_ids: ["lander_main_hub"],
    failed_link_ids: [],
    degraded_link_ids: [],
    invalid_service_ids: ["science_data"],
    unreachable_service_ids: ["science_data"],
    qos_degraded_service_ids: [],
    metric_deltas: [],
    propagation_predictions: [{
      root_fault: "main_hub_failure",
      predicted_effect: "service_unreachable",
      predicted_layer: "service",
      predicted_probability: 0.82,
      predicted_delay_ms: 45,
      propagation_path: "main_hub_failure -> route_invalid -> service_unreachable",
      confidence: 0.9
    }],
    observed_impacts: [{ observed_effect: "service_unreachable", observed_layer: "service", source: "service_results", observed_delay_ms: 50, evidence: "science_data unreachable" }],
    propagation_comparison: [{ predicted_effect: "service_unreachable", observed: true, true_positive: true, false_positive: false, false_negative: false, predicted_delay_ms: 45, observed_delay_ms: 50, delay_error_pct: 10 }],
    propagation_metrics: {},
    summary: {}
  };
}
