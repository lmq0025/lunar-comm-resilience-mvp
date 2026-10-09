export interface HealingAblationRow {
  strategy_set: string;
  indicator_pass_count: number;
  subnet_paralysis_probability: number;
  control_command_loss_rate: number;
  video_return_success_rate: number;
  science_data_interruption_s: number;
  relay_handover_delay_disturbance_ms: number;
}

export interface HealingAblationDataset {
  dataset_kind: "historical_verified_experiment";
  title: string;
  source_file: string;
  source_config: string;
  source_sha256: string;
  verified_against: string;
  verified_against_sha256: string;
  total_indicators: number;
  rows: HealingAblationRow[];
}

export async function loadHealingAblationReference(): Promise<HealingAblationDataset> {
  const response = await fetch("/assets/healing_ablation_round7.json", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`消融实验参考数据加载失败（HTTP ${response.status}）`);
  const data = await response.json() as HealingAblationDataset;
  if (data.dataset_kind !== "historical_verified_experiment" || data.total_indicators !== 14 || data.rows.length !== 5) {
    throw new Error("消融实验参考数据结构不完整");
  }
  return data;
}

export const ABLATION_STRATEGY_NAMES: Record<string, string> = {
  no_healing: "无自愈",
  reroute_only: "仅备用路径重路由",
  reroute_plus_priority: "加入优先级调度",
  reroute_plus_priority_plus_degradation: "加入业务降级",
  full_healing: "全部五种策略"
};
