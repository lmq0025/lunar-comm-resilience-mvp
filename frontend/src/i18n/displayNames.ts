import type { NodePayload, ServicePayload } from "../api/contracts";

export interface DisplayNameOptions {
  customName?: string | null;
  modelName?: string | null;
  fallbackPrefix?: string;
}

const NODE_NAMES: Record<string, string> = {
  lander_main_hub: "着陆器主通信枢纽",
  relay_backup_1: "1号月面备用中继",
  relay_backup_2: "2号月面备用中继",
  rover_1: "1号月球车",
  rover_2: "2号月球车",
  rover_3: "3号月球车",
  edge_compute: "月面边缘计算节点",
  science_station: "月面科学载荷站",
  camera_station: "月面高清成像站",
  teleop_terminal: "月面遥操作终端",
  lunar_orbiter: "月球轨道中继卫星",
  ground_station: "地球地面测控站"
};

const SERVICE_NAMES: Record<string, string> = {
  control_command: "地月遥控指令",
  teleoperation: "月面近实时遥操作",
  science_data: "科学探测数据回传",
  hd_video: "高清图像视频回传"
};

const NODE_TYPE_NAMES: Record<string, string> = {
  main_hub: "着陆器主枢纽",
  surface_relay: "月面通信中继",
  rover: "月球车",
  compute: "边缘计算设备",
  payload: "科学仪器与载荷",
  terminal: "遥操作终端",
  orbiter: "月球轨道中继卫星",
  ground: "地球地面天线站"
};

const LINK_TYPE_NAMES: Record<string, string> = {
  local: "月面局域链路",
  redundant_surface: "月面冗余中继链路",
  surface_to_orbit: "月面至月轨链路",
  orbit_to_ground: "月轨至地球链路"
};

const FAULT_NAMES: Record<string, string> = {
  radiation_cpu_lock: "辐射导致节点处理迟滞",
  single_event_upset: "单粒子翻转",
  dust_antenna_degradation: "月尘导致天线性能退化",
  thermal_rf_drift: "极端温度射频漂移",
  terrain_obstruction: "地形遮挡",
  main_hub_failure: "主通信枢纽失效",
  relay_handover_delay: "中继切换时延异常",
  buffer_overflow: "多业务缓存溢出",
  route_oscillation: "路由振荡",
  power_limited_mode: "功率受限模式"
};

const PROPAGATION_EVENT_NAMES: Record<string, string> = {
  main_hub_failure: "主通信枢纽失效",
  route_invalid: "业务路径失效",
  service_unreachable: "业务不可达",
  science_data_interruption: "科学数据传输中断",
  dust_antenna_degradation: "月尘导致天线性能退化",
  snr_degradation: "信噪比下降",
  packet_loss_increase: "丢包率上升",
  relay_handover_delay: "中继切换时延异常",
  end_to_end_delay_increase: "端到端时延增加",
  buffer_overflow: "缓存溢出",
  congestion_increase: "网络拥塞加剧",
  service_qos_drop: "业务服务质量下降",
  video_return_failure: "视频回传失败"
};

const HEALING_NAMES: Record<string, string> = {
  reroute_backup_path: "备用路径重路由",
  priority_scheduling: "高优先级业务调度",
  service_degradation: "业务降级传输",
  store_and_forward: "存储转发",
  relay_pre_handover: "中继预切换"
};

const STAGE_NAMES: Record<string, string> = {
  editor: "拓扑编辑",
  fault_plan: "故障计划预览",
  nominal: "正常状态",
  faulted: "故障后",
  before_healing: "故障后、自愈前",
  healing: "自愈执行",
  healing_actions: "非路由自愈执行后",
  healing_executed: "非路由自愈执行后",
  after_healing: "自愈后",
  results: "结果分析",
  three_stage_comparison: "三阶段对比",
  indicators: "指标验证",
  physical: "物理层",
  network: "网络层",
  service: "业务层",
  fault: "故障层",
  propagation: "传播层"
};

const STATUS_NAMES: Record<string, string> = {
  implemented: "已实现",
  registered_only: "已登记、尚未实现",
  passed: "通过",
  failed: "未通过",
  not_applicable: "不适用",
  running: "运行中",
  completed: "已完成",
  interrupted: "已中断",
  queued: "等待执行",
  cancelled: "已取消",
  created: "已创建",
  topology_built: "拓扑已构建",
  nominal_routes_calculated: "正常路径已计算",
  nominal_simulated: "正常状态已仿真",
  faults_injected: "故障已注入",
  fault_impact_analyzed: "故障影响已分析",
  healing_executed: "非路由自愈已执行",
  healed_routes_calculated: "备用路径已重算",
  after_healing_simulated: "自愈后状态已仿真",
  indicators_verified: "技术指标已验证"
};

const ROUTE_SOURCE_NAMES: Record<string, string> = {
  nominal_computed: "正常状态计算路径",
  inherited_nominal: "继承正常路径",
  healing_verified_inherited: "自愈后待重算继承路径",
  reroute_backup_path: "备用路径重路由",
  shortest_delay: "最小时延路由"
};

export interface IndicatorDisplayMeta {
  name: string;
  unit: string;
  layer: string;
}

const INDICATORS: Record<string, IndicatorDisplayMeta> = {
  rf_lifetime_prediction_error: { name: "射频设备寿命预测误差", unit: "%", layer: "物理层" },
  dust_gain_loss_error: { name: "月尘天线增益损失量化误差", unit: "%", layer: "物理层" },
  main_hub_subnet_paralysis: { name: "主枢纽失效子网瘫痪概率", unit: "比率", layer: "网络层" },
  relay_handover_disturbance: { name: "中继切换端到端时延扰动", unit: "毫秒", layer: "网络层" },
  ka_channel_availability: { name: "Ka频段信道可用率", unit: "比率", layer: "物理层" },
  route_convergence: { name: "路由收敛时间", unit: "毫秒", layer: "网络层" },
  urllc_command_loss: { name: "控制指令丢包率", unit: "比率", layer: "业务层" },
  hd_video_success: { name: "高清影像回传成功率", unit: "比率", layer: "业务层" },
  fault_library_coverage: { name: "故障模式库覆盖数量", unit: "项", layer: "故障层" },
  cascading_fault_prediction_accuracy: { name: "级联故障预测准确率", unit: "比率", layer: "故障层" },
  fault_propagation_delay_error: { name: "故障传播时延误差", unit: "%", layer: "故障层" },
  service_degradation_decision: { name: "业务降级决策时间", unit: "毫秒", layer: "业务层" },
  resource_contention_resolution: { name: "资源竞争解决率", unit: "比率", layer: "业务层" },
  science_data_interruption: { name: "科学数据回传中断时间", unit: "秒", layer: "业务层" }
};

const METRIC_NAMES: Record<string, string> = {
  rf_lifetime_prediction_error_pct: "射频设备寿命预测误差",
  dust_gain_loss_quantification_error_pct: "月尘天线增益损失量化误差",
  subnet_paralysis_probability: "子网瘫痪概率",
  relay_handover_delay_disturbance_ms: "中继切换端到端时延扰动",
  ka_channel_availability: "Ka频段信道可用率",
  route_convergence_time_ms: "路由收敛时间",
  control_command_loss_rate: "控制指令丢包率",
  video_return_success_rate: "高清影像回传成功率",
  fault_mode_library_coverage: "故障模式库覆盖数量",
  cascading_fault_prediction_accuracy: "级联故障预测准确率",
  fault_propagation_delay_error_pct: "故障传播时延误差",
  service_degradation_decision_ms: "业务降级决策时间",
  resource_contention_resolution_rate: "资源竞争解决率",
  science_data_interruption_s: "科学数据回传中断时间",
  availability: "可用率",
  active_edge_count: "活动链路数",
  active_node_count: "活动节点数",
  throughput_mbps: "吞吐量",
  end_to_end_delay_ms: "端到端时延",
  packet_loss_rate: "丢包率",
  success_rate: "业务成功率",
  interruption_s: "中断时间"
};

const ARTIFACT_PURPOSES: Record<string, string> = {
  "metrics_summary.csv": "三阶段指标汇总",
  "indicator_check.csv": "技术指标验证结果",
  "fault_events.csv": "故障事件记录",
  "healing_actions.csv": "自愈动作记录",
  "service_results.csv": "三阶段业务结果",
  "service_routes.csv": "三阶段业务路径",
  "fault_propagation_predictions.csv": "故障传播预测",
  "observed_impacts.csv": "故障实际影响",
  "fault_propagation_comparison.csv": "预测与观测对比",
  "fault_propagation_metrics.csv": "传播模型指标",
  "physical_model_validation.csv": "物理模型验证明细",
  "physical_model_metrics.csv": "物理模型指标",
  "topology_nominal.png": "正常拓扑图",
  "topology_before.png": "故障后拓扑图",
  "topology_after.png": "自愈后拓扑图",
  "report.md": "完整仿真报告"
};

const ENGINEERING_TEXT: Record<string, string> = {
  "fault registered without additional MVP degradation": "故障已登记，当前版本尚未施加专属退化作用",
  "node_processing_delay_ms increased": "节点处理时延增加",
  "RF link gain, availability, and packet loss degraded": "射频链路增益和可用率下降，丢包率上升",
  "target node and adjacent links disabled": "目标节点及相邻链路失效",
  "handover delay added to relay links": "中继链路增加切换时延",
  "congestion multiplier increased": "网络拥塞倍率增加",
  "recompute active backup paths": "重新计算当前可用的备用路径",
  "reserve bandwidth and loss protection": "预留带宽并提供丢包保护",
  "reduce HD video bandwidth demand": "降低高清视频业务带宽需求",
  "buffer science data for resume forwarding": "缓存科学数据并在恢复后继续转发",
  "reduce relay handover disturbance": "降低中继切换扰动",
  "reduce service bandwidth demand": "降低业务带宽需求",
  "enable buffer and resume forwarding": "启用缓存并恢复转发",
  "pre-stage handover and reduce disturbance": "预先准备中继切换并降低扰动",
  "priority protection": "优先级保护",
  "delay target exceeded": "超过时延目标",
  "store and forward": "存储转发",
  congested: "网络拥塞",
  "bitrate degraded": "码率降级",
  unreachable: "业务不可达",
  "missing route": "缺少业务路径",
  "no active path": "当前拓扑没有可用路径",
  "HD video bitrate reduced to degraded_bandwidth_mbps": "高清视频码率已降至配置的降级带宽",
  "hd_video degraded bandwidth not configured": "高清视频业务未配置降级带宽",
  "science data buffered for resume forwarding": "科学数据已缓存并等待恢复转发",
  "science_data service missing": "场景中缺少科学数据业务",
  "no handover disturbance found": "未发现中继切换扰动",
  "MVP physical model compared with packaged reference CSV": "物理模型与随软件分发的参考数据进行对比",
  "MVP physical model compared with internal replaceable reference curve": "物理模型与可替换的内部参考曲线进行对比",
  "MVP internal benchmark model": "内部基准模型验证",
  "MVP topology and service reachability simulation": "拓扑与业务可达性仿真验证",
  "MVP handover fault and healing model": "中继切换故障与自愈模型验证",
  "MVP link model": "链路模型验证",
  "reroute_backup_path healing action": "备用路径重路由动作验证",
  "MVP service simulation": "业务仿真验证",
  "MVP service simulation with degradation policy": "启用业务降级策略的业务仿真验证",
  "coded fault library": "代码实现的故障模式库核查",
  "MVP fault propagation graph prediction compared with simulated observed impacts": "故障传播图预测与仿真观测影响对比",
  "service_degradation healing action": "业务降级自愈动作验证",
  "protected congested-service scheduling result": "受保护拥塞业务的调度结果验证",
  "store-and-forward simulation": "存储转发仿真验证",
  service_routes: "业务路径结果",
  service_results: "业务仿真结果",
  metrics: "指标计算结果",
  active_topology: "当前活动拓扑",
  relay_links: "中继链路"
};

export function readableFallback(id: string, prefix = "对象"): string {
  const normalized = id.trim().replace(/[_-]+/g, " ");
  return normalized ? `${prefix}（${normalized}）` : `未命名${prefix}`;
}

export function displayName(id: string, mapping: Record<string, string>, options: DisplayNameOptions = {}): string {
  return clean(options.customName) ?? clean(options.modelName) ?? mapping[id] ?? readableFallback(id, options.fallbackPrefix);
}

export function nodeDisplayName(nodeOrId: NodePayload | string, modelName?: string | null): string {
  const node = typeof nodeOrId === "string" ? null : nodeOrId;
  const id = typeof nodeOrId === "string" ? nodeOrId : nodeOrId.id;
  return displayName(id, NODE_NAMES, { customName: node?.name, modelName, fallbackPrefix: "节点" });
}

export function serviceDisplayName(serviceOrId: ServicePayload | string, modelName?: string | null): string {
  const service = typeof serviceOrId === "string" ? null : serviceOrId;
  const id = typeof serviceOrId === "string" ? serviceOrId : serviceOrId.id;
  return displayName(id, SERVICE_NAMES, { customName: service?.name, modelName, fallbackPrefix: "业务" });
}

export const nodeTypeDisplayName = (id: string, modelName?: string | null) => displayName(id, NODE_TYPE_NAMES, { modelName, fallbackPrefix: "设备类型" });
export const linkTypeDisplayName = (id: string, modelName?: string | null) => displayName(id, LINK_TYPE_NAMES, { modelName, fallbackPrefix: "链路类型" });
export const faultDisplayName = (id: string, modelName?: string | null) => displayName(id, FAULT_NAMES, { modelName, fallbackPrefix: "故障" });
export const propagationEventDisplayName = (id: string) => displayName(id, PROPAGATION_EVENT_NAMES, { fallbackPrefix: "传播事件" });
export const healingDisplayName = (id: string, modelName?: string | null) => displayName(id, HEALING_NAMES, { modelName, fallbackPrefix: "自愈策略" });
export const stageDisplayName = (id: string) => displayName(id, STAGE_NAMES, { fallbackPrefix: "阶段" });
export const statusDisplayName = (id: string) => displayName(id, STATUS_NAMES, { fallbackPrefix: "状态" });
export const routeSourceDisplayName = (id: string | null | undefined) => id ? displayName(id, ROUTE_SOURCE_NAMES, { fallbackPrefix: "路由来源" }) : "未提供";
export const metricDisplayName = (id: string) => displayName(id, METRIC_NAMES, { fallbackPrefix: "指标" });

export function indicatorDisplayMeta(id: string, fallbackName?: string | null, fallbackUnit?: string | null, fallbackLayer?: string | null): IndicatorDisplayMeta {
  return INDICATORS[id] ?? {
    name: clean(fallbackName) ?? readableFallback(id, "技术指标"),
    unit: unitDisplayName(fallbackUnit ?? ""),
    layer: stageDisplayName(fallbackLayer ?? "other")
  };
}

export function unitDisplayName(unit: string): string {
  const units: Record<string, string> = { ratio: "比率", count: "项", ms: "毫秒", s: "秒", "%": "%", Mbps: "Mbps", dB: "dB", h: "小时" };
  return units[unit] ?? unit;
}

export function artifactPurpose(filename: string, backendPurpose?: string | null): string {
  return clean(backendPurpose) ?? ARTIFACT_PURPOSES[filename] ?? "仿真成果文件";
}

export function engineeringTextDisplayName(value: string | null | undefined): string {
  const source = clean(value);
  if (!source) return "-";
  if (ENGINEERING_TEXT[source]) return ENGINEERING_TEXT[source];
  const inactiveNode = source.match(/^inactive node (.+)$/);
  if (inactiveNode) return `失效节点：${nodeDisplayName(inactiveNode[1])}（内部 ID：${inactiveNode[1]}）`;
  const inactiveEdge = source.match(/^inactive edge (.+)->(.+)$/);
  if (inactiveEdge) return `失效链路：${nodeDisplayName(inactiveEdge[1])} → ${nodeDisplayName(inactiveEdge[2])}`;
  const rerouted = source.match(/^rerouted services: (\d+)$/);
  if (rerouted) return `已重路由业务：${rerouted[1]} 项`;
  const failed = source.match(/^failed services: (\d+)$/);
  if (failed) return `恢复失败业务：${failed[1]} 项`;
  const updated = source.match(/^updated (\d+) relay links$/);
  if (updated) return `已更新 ${updated[1]} 条中继链路`;
  const evidence = source
    .replace(/^before_healing route_valid=false$/, "故障后、自愈前的业务路径无效")
    .replace(/^before_healing service reachable=false$/, "故障后、自愈前的业务不可达")
    .replace(/^before_healing snr_db below nominal$/, "故障后信噪比低于正常状态")
    .replace(/^before_healing packet_loss_rate above nominal$/, "故障后丢包率高于正常状态")
    .replace(/^handover disturbance or delay increase observed$/, "观测到中继切换扰动或时延增加")
    .replace(/^before_healing congestion_rate above nominal$/, "故障后拥塞率高于正常状态")
    .replace(/^before_healing service success_rate below 0\.999$/, "故障后业务成功率低于 0.999")
    .replace(/^science_data interruption_s > 0$/, "科学数据业务中断时间大于 0")
    .replace(/^hd_video success_rate below target$/, "高清视频业务成功率低于目标值");
  if (evidence !== source) return evidence;
  const segments = source.split(/;\s*/);
  if (segments.length > 1) return segments.map(engineeringTextDisplayName).join("；");
  return source;
}

export function referenceSourceDisplayName(value: string | null | undefined): string {
  const source = clean(value);
  if (!source) return "-";
  const translated = ENGINEERING_TEXT[source];
  if (translated) return translated;
  const filename = source.split(/[\\/]/).at(-1);
  return filename ? `参考数据文件：${filename}` : source;
}

export function withInternalId(name: string, id: string): string {
  return `${name}（内部 ID：${id}）`;
}

function clean(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
