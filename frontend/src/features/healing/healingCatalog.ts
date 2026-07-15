import type { CatalogItemResponse, ScenarioPayload } from "../../api/contracts";

export const HEALING_STRATEGY_IDS = [
  "reroute_backup_path",
  "priority_scheduling",
  "service_degradation",
  "store_and_forward",
  "relay_pre_handover"
] as const;

export type HealingStrategyId = (typeof HEALING_STRATEGY_IDS)[number];

export const OFFLINE_HEALING_CATALOG: CatalogItemResponse[] = [
  {
    id: "reroute_backup_path",
    code: "reroute_backup_path",
    display_name_zh: "备用路径重路由",
    description_zh: "在当前活动拓扑上重新计算业务路径。",
    execution_step: 7,
    strategy_category: "routing",
    implementation_status: "implemented",
    target_summary_zh: "所有需要恢复连通性的业务路径",
    preconditions_zh: "故障后仍存在可用备用链路。",
    implemented_effect: "recompute active backup paths"
  },
  {
    id: "priority_scheduling",
    code: "priority_scheduling",
    display_name_zh: "高优先级业务调度",
    description_zh: "保护 control_command 和 teleoperation 业务。",
    execution_step: 6,
    strategy_category: "non_routing",
    implementation_status: "implemented",
    target_summary_zh: "控制指令和遥操作业务",
    preconditions_zh: "场景中存在 control_command 或 teleoperation 业务。",
    implemented_effect: "reserve bandwidth and loss protection"
  },
  {
    id: "service_degradation",
    code: "service_degradation",
    display_name_zh: "业务降级传输",
    description_zh: "将 hd_video 需求带宽降为 degraded_bandwidth_mbps。",
    execution_step: 6,
    strategy_category: "non_routing",
    implementation_status: "implemented",
    target_summary_zh: "高清视频回传业务",
    preconditions_zh: "存在 hd_video 且配置了 degraded_bandwidth_mbps。",
    implemented_effect: "reduce HD video bandwidth demand"
  },
  {
    id: "store_and_forward",
    code: "store_and_forward",
    display_name_zh: "存储转发",
    description_zh: "缓存 science_data 并在网络恢复后继续转发。",
    execution_step: 6,
    strategy_category: "non_routing",
    implementation_status: "implemented",
    target_summary_zh: "科学数据回传业务",
    preconditions_zh: "场景中存在 science_data 业务。",
    implemented_effect: "buffer science data for resume forwarding"
  },
  {
    id: "relay_pre_handover",
    code: "relay_pre_handover",
    display_name_zh: "中继预切换",
    description_zh: "降低中继切换扰动时延。",
    execution_step: 6,
    strategy_category: "non_routing",
    implementation_status: "implemented",
    target_summary_zh: "存在切换扰动的中继链路",
    preconditions_zh: "故障链路存在 handover disturbance。",
    implemented_effect: "reduce relay handover disturbance"
  }
];

export function healingCatalogItems(backendItems?: CatalogItemResponse[]): CatalogItemResponse[] {
  const source = backendItems?.length ? backendItems : OFFLINE_HEALING_CATALOG;
  const byId = new Map(source.map((item) => [item.id, item]));
  return HEALING_STRATEGY_IDS.map((id) => byId.get(id) ?? OFFLINE_HEALING_CATALOG.find((item) => item.id === id)).filter(
    Boolean
  ) as CatalogItemResponse[];
}

export function normalizeHealingEnabled(enabled: string[]): string[] {
  const selected = new Set(enabled);
  return HEALING_STRATEGY_IDS.filter((id) => selected.has(id));
}

export function healingPreconditionHint(strategyId: string, scenario: ScenarioPayload): string {
  if (strategyId === "priority_scheduling") {
    const matched = scenario.services.filter((service) => ["control_command", "teleoperation"].includes(service.id));
    return matched.length ? `检测到 ${matched.map((service) => service.id).join(", ")}` : "未检测到 control_command 或 teleoperation。";
  }
  if (strategyId === "service_degradation") {
    const service = scenario.services.find((item) => item.id === "hd_video");
    return service?.degraded_bandwidth_mbps != null ? `hd_video 已配置降级带宽 ${service.degraded_bandwidth_mbps} Mbps` : "未检测到 hd_video 的降级带宽配置。";
  }
  if (strategyId === "store_and_forward") {
    return scenario.services.some((service) => service.id === "science_data") ? "检测到 science_data 业务。" : "未检测到 science_data 业务。";
  }
  if (strategyId === "relay_pre_handover") {
    return "需要在故障阶段存在中继切换扰动；最终以第 6 步自愈动作记录为准。";
  }
  return "需要故障后仍存在可达备用拓扑；最终以第 7 步重路由结果为准。";
}
