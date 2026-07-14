import type { CatalogItemResponse } from "../../api/contracts";

export const OFFLINE_FAULT_CATALOG: CatalogItemResponse[] = [
  {
    id: "main_hub_failure",
    code: "main_hub_failure",
    display_name_zh: "主枢纽失效",
    description_zh: "关闭目标节点，使依赖路径失效。",
    target_scope: "node",
    implementation_status: "implemented",
    implemented_effect: "target node disabled"
  },
  {
    id: "relay_node_failure",
    code: "relay_node_failure",
    display_name_zh: "中继节点失效",
    description_zh: "关闭目标中继节点。",
    target_scope: "node",
    implementation_status: "implemented",
    implemented_effect: "target node disabled"
  },
  {
    id: "terminal_node_failure",
    code: "terminal_node_failure",
    display_name_zh: "终端节点失效",
    description_zh: "关闭目标业务端节点。",
    target_scope: "node",
    implementation_status: "implemented",
    implemented_effect: "target node disabled"
  },
  {
    id: "link_outage",
    code: "link_outage",
    display_name_zh: "链路中断",
    description_zh: "关闭目标链路。",
    target_scope: "link",
    implementation_status: "implemented",
    implemented_effect: "target link disabled"
  },
  {
    id: "link_degradation",
    code: "link_degradation",
    display_name_zh: "链路退化",
    description_zh: "降低目标链路容量和可用率。",
    target_scope: "link",
    implementation_status: "implemented",
    implemented_effect: "target link degraded"
  },
  {
    id: "rf_interference",
    code: "rf_interference",
    display_name_zh: "射频干扰",
    description_zh: "影响全部射频链路。",
    target_scope: "all_rf_links",
    implementation_status: "implemented",
    implemented_effect: "rf links degraded"
  },
  {
    id: "dust_attenuation",
    code: "dust_attenuation",
    display_name_zh: "月尘衰减",
    description_zh: "登记月尘导致的链路增益损耗。",
    target_scope: "all_rf_links",
    implementation_status: "registered_only",
    implemented_effect: "registered for physical model validation"
  },
  {
    id: "radiation_event",
    code: "radiation_event",
    display_name_zh: "辐射事件",
    description_zh: "登记辐射环境异常。",
    target_scope: "global",
    implementation_status: "registered_only",
    implemented_effect: "registered only"
  },
  {
    id: "power_drop",
    code: "power_drop",
    display_name_zh: "供电下降",
    description_zh: "登记目标节点或链路供电异常。",
    target_scope: "node_or_link",
    implementation_status: "registered_only",
    implemented_effect: "registered only"
  },
  {
    id: "antenna_misalignment",
    code: "antenna_misalignment",
    display_name_zh: "天线失准",
    description_zh: "登记链路或节点天线指向异常。",
    target_scope: "node_or_link",
    implementation_status: "registered_only",
    implemented_effect: "registered only"
  }
];

export function faultCatalogItems(onlineItems: CatalogItemResponse[] | undefined): CatalogItemResponse[] {
  return onlineItems && onlineItems.length > 0 ? onlineItems : OFFLINE_FAULT_CATALOG;
}

export function faultCatalogMap(onlineItems: CatalogItemResponse[] | undefined): Map<string, CatalogItemResponse> {
  return new Map(faultCatalogItems(onlineItems).map((item) => [item.id, item]));
}
