import type { CatalogItemResponse } from "../../api/contracts";

export const BACKEND_FAULT_IDS = [
  "radiation_cpu_lock",
  "single_event_upset",
  "dust_antenna_degradation",
  "thermal_rf_drift",
  "terrain_obstruction",
  "main_hub_failure",
  "relay_handover_delay",
  "buffer_overflow",
  "route_oscillation",
  "power_limited_mode"
] as const;

export const OFFLINE_FAULT_CATALOG: CatalogItemResponse[] = [
  {
    id: "radiation_cpu_lock",
    code: "radiation_cpu_lock",
    display_name_zh: "辐射导致节点处理迟滞",
    description_zh: "对目标节点增加处理时延，模拟辐射导致的 CPU 锁定或恢复迟滞。",
    target_scope: "node",
    implementation_status: "implemented",
    implemented_effect: "node_processing_delay_ms increased"
  },
  {
    id: "single_event_upset",
    code: "single_event_upset",
    display_name_zh: "单粒子翻转",
    description_zh: "该故障已纳入故障库，但当前 MVP 尚未实现专属退化作用。",
    target_scope: "node_or_link",
    implementation_status: "registered_only",
    implemented_effect: "fault registered without additional MVP degradation"
  },
  {
    id: "dust_antenna_degradation",
    code: "dust_antenna_degradation",
    display_name_zh: "月尘天线退化",
    description_zh: "对射频链路降低天线增益、降低可用率并提高丢包率。",
    target_scope: "all_rf_links",
    implementation_status: "implemented",
    implemented_effect: "RF link gain, availability, and packet loss degraded"
  },
  {
    id: "thermal_rf_drift",
    code: "thermal_rf_drift",
    display_name_zh: "极端温度射频漂移",
    description_zh: "该故障已纳入故障库，但当前 MVP 尚未实现专属退化作用。",
    target_scope: "node_or_link",
    implementation_status: "registered_only",
    implemented_effect: "fault registered without additional MVP degradation"
  },
  {
    id: "terrain_obstruction",
    code: "terrain_obstruction",
    display_name_zh: "地形遮挡",
    description_zh: "该故障已纳入故障库，但当前 MVP 尚未实现专属退化作用。",
    target_scope: "node_or_link",
    implementation_status: "registered_only",
    implemented_effect: "fault registered without additional MVP degradation"
  },
  {
    id: "main_hub_failure",
    code: "main_hub_failure",
    display_name_zh: "月面主枢纽失效",
    description_zh: "关闭目标主枢纽节点及其相邻链路；故障阶段继承正常路径，不自动重路由。",
    target_scope: "node",
    implementation_status: "implemented",
    implemented_effect: "target node and adjacent links disabled"
  },
  {
    id: "relay_handover_delay",
    code: "relay_handover_delay",
    display_name_zh: "中继切换时间异常",
    description_zh: "对月面到轨道、轨道到地面链路增加切换扰动时间。",
    target_scope: "all_rf_links",
    implementation_status: "implemented",
    implemented_effect: "handover delay added to relay links"
  },
  {
    id: "buffer_overflow",
    code: "buffer_overflow",
    display_name_zh: "多业务缓冲溢出",
    description_zh: "对链路设置拥塞倍率，用于影响后续业务仿真。",
    target_scope: "global",
    implementation_status: "implemented",
    implemented_effect: "congestion multiplier increased"
  },
  {
    id: "route_oscillation",
    code: "route_oscillation",
    display_name_zh: "路由振荡",
    description_zh: "该故障已纳入故障库，但当前 MVP 尚未实现专属退化作用。",
    target_scope: "node_or_link",
    implementation_status: "registered_only",
    implemented_effect: "fault registered without additional MVP degradation"
  },
  {
    id: "power_limited_mode",
    code: "power_limited_mode",
    display_name_zh: "功率受限模式",
    description_zh: "该故障已纳入故障库，但当前 MVP 尚未实现专属退化作用。",
    target_scope: "node_or_link",
    implementation_status: "registered_only",
    implemented_effect: "fault registered without additional MVP degradation"
  }
];

export function faultCatalogItems(onlineItems: CatalogItemResponse[] | undefined): CatalogItemResponse[] {
  return onlineItems && onlineItems.length > 0 ? onlineItems : OFFLINE_FAULT_CATALOG;
}

export function faultCatalogMap(onlineItems: CatalogItemResponse[] | undefined): Map<string, CatalogItemResponse> {
  return new Map(faultCatalogItems(onlineItems).map((item) => [item.id, item]));
}
