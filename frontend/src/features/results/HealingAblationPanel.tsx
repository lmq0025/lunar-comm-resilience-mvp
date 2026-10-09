import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Empty, Select, Space, Spin, Tag, Typography } from "antd";
import { ABLATION_STRATEGY_NAMES, loadHealingAblationReference, type HealingAblationDataset, type HealingAblationRow } from "./ablationData";

const METRICS: Array<{ key: keyof HealingAblationRow; label: string; unit: string; better: "higher" | "lower" }> = [
  { key: "subnet_paralysis_probability", label: "子网瘫痪概率", unit: "比率", better: "lower" },
  { key: "control_command_loss_rate", label: "控制指令丢包率", unit: "比率", better: "lower" },
  { key: "video_return_success_rate", label: "高清影像成功率", unit: "比率", better: "higher" },
  { key: "science_data_interruption_s", label: "科学数据中断时间", unit: "秒", better: "lower" },
  { key: "relay_handover_delay_disturbance_ms", label: "中继切换扰动", unit: "毫秒", better: "lower" }
];

export function HealingAblationPanel() {
  const [dataset, setDataset] = useState<HealingAblationDataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metricKey, setMetricKey] = useState<keyof HealingAblationRow>("science_data_interruption_s");

  useEffect(() => {
    let active = true;
    void loadHealingAblationReference().then((value) => active && setDataset(value)).catch((reason) => active && setError(reason instanceof Error ? reason.message : "消融数据加载失败"));
    return () => { active = false; };
  }, []);

  const metric = METRICS.find((item) => item.key === metricKey) ?? METRICS[0];
  const maxMetric = useMemo(() => Math.max(...(dataset?.rows.map((row) => Number(row[metricKey])) ?? [1]), 1e-12), [dataset, metricKey]);

  if (error) return <Card size="small" title="五级自愈策略消融"><Empty description={error} /></Card>;
  if (!dataset) return <Card size="small" title="五级自愈策略消融"><div className="centered-loading"><Spin tip="正在读取已验证实验成果"><span /></Spin></div></Card>;

  return (
    <Card size="small" title="五级自愈策略消融（历史验证实验）" data-testid="healing-ablation-panel">
      <Alert
        type="info"
        showIcon
        message="该图来自独立五级消融实验，不是当前九步单场景运行推导值。"
        description={`配置：${dataset.source_config}；成果：${dataset.source_file}；SHA-256：${dataset.source_sha256.slice(0, 16)}…`}
      />
      <div className="ablation-pass-chart" role="img" aria-label="五级自愈策略指标通过数量">
        {dataset.rows.map((row, index) => {
          const previous = index ? dataset.rows[index - 1].indicator_pass_count : 0;
          return (
            <div className="ablation-column" key={row.strategy_set}>
              <div className="ablation-value">{row.indicator_pass_count}/{dataset.total_indicators}<small>+{row.indicator_pass_count - previous}</small></div>
              <div className="ablation-bar-track"><div className="ablation-bar" style={{ height: `${(row.indicator_pass_count / dataset.total_indicators) * 100}%` }} /></div>
              <span>{ABLATION_STRATEGY_NAMES[row.strategy_set] ?? row.strategy_set}</span>
            </div>
          );
        })}
      </div>
      <Space wrap className="chart-toolbar">
        <Typography.Text strong>策略贡献指标</Typography.Text>
        <Select value={metricKey} onChange={(value) => setMetricKey(value)} options={METRICS.map((item) => ({ value: item.key, label: item.label }))} />
        <Tag>{metric.better === "higher" ? "数值越大越好" : "数值越小越好"}</Tag>
        <Tag>单位：{metric.unit}</Tag>
      </Space>
      <div className="metric-strip-chart">
        {dataset.rows.map((row) => {
          const value = Number(row[metricKey]);
          return <div className="metric-strip-row" key={row.strategy_set}><span>{ABLATION_STRATEGY_NAMES[row.strategy_set]}</span><div><i style={{ width: `${(value / maxMetric) * 100}%` }} /></div><strong>{format(value)}</strong></div>;
        })}
      </div>
    </Card>
  );
}

function format(value: number): string {
  if (!Number.isFinite(value)) return "不可计算";
  if (Math.abs(value) > 0 && Math.abs(value) < 0.001) return value.toExponential(3);
  return value.toFixed(value < 10 ? 4 : 2).replace(/0+$/, "").replace(/\.$/, "");
}
