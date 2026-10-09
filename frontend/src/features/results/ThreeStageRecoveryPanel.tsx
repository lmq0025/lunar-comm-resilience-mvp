import { useMemo, useState } from "react";
import { Alert, Card, Select, Space, Table, Tag, Typography } from "antd";
import type { ServicePayload, ServiceSimulationResultResponse } from "../../api/contracts";
import { serviceDisplayName } from "../../i18n/displayNames";
import { formatSimulationNumber } from "../simulation/formatters";

type StageKey = "nominal" | "before" | "after";
type Direction = "higher" | "lower";

interface StageResults {
  nominal: ServiceSimulationResultResponse[];
  before: ServiceSimulationResultResponse[];
  after: ServiceSimulationResultResponse[];
}

interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  direction: Direction;
  value: (rows: ServiceSimulationResultResponse[]) => number | null;
}

const STAGES: Array<{ key: StageKey; label: string; className: string }> = [
  { key: "nominal", label: "正常状态", className: "nominal" },
  { key: "before", label: "故障后、自愈前", className: "faulted" },
  { key: "after", label: "自愈后", className: "healed" }
];

const METRICS: MetricDefinition[] = [
  { key: "valid", label: "有效业务数量", unit: "项", direction: "higher", value: (rows) => rows.filter((row) => row.route_valid).length },
  { key: "reachable", label: "业务可达数量", unit: "项", direction: "higher", value: (rows) => rows.filter((row) => row.reachable).length },
  { key: "success", label: "平均业务成功率", unit: "比率", direction: "higher", value: (rows) => average(rows.map((row) => row.success_rate)) },
  { key: "availability", label: "平均业务可用率", unit: "比率", direction: "higher", value: (rows) => average(rows.map((row) => row.availability)) },
  { key: "loss", label: "平均丢包率", unit: "比率", direction: "lower", value: (rows) => average(rows.map((row) => row.packet_loss_rate)) },
  { key: "interruption", label: "平均中断时间", unit: "秒", direction: "lower", value: (rows) => average(rows.map((row) => row.interruption_s)) },
  { key: "throughput", label: "总吞吐量", unit: "Mbps", direction: "higher", value: (rows) => sumStrict(rows.map((row) => row.throughput_mbps)) },
  { key: "delay", label: "平均端到端时延", unit: "毫秒", direction: "lower", value: (rows) => averageStrict(rows.map((row) => numeric(row.end_to_end_delay_ms))) }
];

export function ThreeStageRecoveryPanel({ services, nominal, before, after }: { services: ServicePayload[]; nominal: ServiceSimulationResultResponse[]; before: ServiceSimulationResultResponse[]; after: ServiceSimulationResultResponse[] }) {
  const [metricKey, setMetricKey] = useState("valid");
  const metric = METRICS.find((item) => item.key === metricKey) ?? METRICS[0];
  const results: StageResults = useMemo(() => ({ nominal, before, after }), [after, before, nominal]);
  const values = STAGES.map((stage) => metric.value(results[stage.key]));
  const finiteMax = Math.max(...values.filter((value): value is number => value != null && Number.isFinite(value)), 1e-12);
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const rows = services.map((service) => ({
    key: service.id,
    service,
    nominal: nominal.find((item) => item.service_id === service.id),
    before: before.find((item) => item.service_id === service.id),
    after: after.find((item) => item.service_id === service.id)
  }));

  return (
    <Card size="small" title="三阶段韧性恢复对比" data-testid="three-stage-recovery-panel">
      <Alert type="info" showIcon message="横轴为离散阶段快照，不代表连续时间采样。" />
      <Space wrap className="chart-toolbar">
        <Typography.Text strong>对比指标</Typography.Text>
        <Select value={metricKey} onChange={setMetricKey} options={METRICS.map((item) => ({ value: item.key, label: item.label }))} />
        <Tag>{metric.direction === "higher" ? "数值越大越好" : "数值越小越好"}</Tag>
        <Tag>单位：{metric.unit}</Tag>
      </Space>
      <div className="three-stage-chart" role="img" aria-label={`三阶段${metric.label}对比`}>
        {STAGES.map((stage, index) => {
          const value = values[index];
          const unavailable = value == null || !Number.isFinite(value);
          return (
            <div className={`stage-column is-${stage.className}`} key={stage.key}>
              <strong>{unavailable ? "不可计算" : formatSimulationNumber(value)}</strong>
              <div className="stage-bar-track"><i className={unavailable ? "is-unavailable" : ""} style={{ height: unavailable ? "12%" : `${Math.max(4, (value / finiteMax) * 100)}%` }} /></div>
              <span>{stage.label}</span>
            </div>
          );
        })}
      </div>
      <Table
        size="small"
        rowKey="key"
        dataSource={rows}
        pagination={false}
        columns={[
          { title: "业务", render: (_, row) => serviceDisplayName(serviceMap.get(row.service.id) ?? row.service.id) },
          { title: "正常吞吐量", render: (_, row) => formatValue(row.nominal?.throughput_mbps, "Mbps") },
          { title: "故障后吞吐量", render: (_, row) => formatValue(row.before?.throughput_mbps, "Mbps") },
          { title: "自愈后吞吐量", render: (_, row) => formatValue(row.after?.throughput_mbps, "Mbps") },
          { title: "正常/故障/自愈可达性", render: (_, row) => [row.nominal, row.before, row.after].map((item) => item?.reachable ? "可达" : "不可达").join(" / ") },
          { title: "正常/故障/自愈中断时间", render: (_, row) => [row.nominal, row.before, row.after].map((item) => formatValue(item?.interruption_s, "秒")).join(" / ") }
        ]}
      />
    </Card>
  );
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function average(values: Array<number | null | undefined>): number | null {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return finite.length ? finite.reduce((total, value) => total + value, 0) / finite.length : null;
}

function averageStrict(values: Array<number | null>): number | null {
  if (!values.length || values.some((value) => value == null)) return null;
  return (values as number[]).reduce((total, value) => total + value, 0) / values.length;
}

function sumStrict(values: number[]): number | null {
  if (values.some((value) => !Number.isFinite(value))) return null;
  return values.reduce((total, value) => total + value, 0);
}

function formatValue(value: unknown, unit: string): string {
  return `${formatSimulationNumber(value as never)} ${unit}`;
}
