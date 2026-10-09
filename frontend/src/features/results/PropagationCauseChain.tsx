import { useMemo, useState } from "react";
import { Card, Descriptions, Empty, Tag, Typography } from "antd";
import type { FaultImpactSummaryResponse, PropagationPredictionResponse } from "../../api/contracts";
import { engineeringTextDisplayName, propagationEventDisplayName, stageDisplayName } from "../../i18n/displayNames";
import { formatSimulationNumber } from "../simulation/formatters";

export function PropagationCauseChain({ faultImpact }: { faultImpact: FaultImpactSummaryResponse }) {
  const predictions = faultImpact.propagation_predictions;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = useMemo(() => predictions.find((item) => keyOf(item) === selectedKey) ?? predictions[0] ?? null, [predictions, selectedKey]);
  if (!predictions.length) return <Card size="small" title="故障传播因果链"><Empty description="当前运行没有传播预测数据" /></Card>;

  const observed = selected ? faultImpact.observed_impacts.find((item) => item.observed_effect === selected.predicted_effect) : null;
  const comparison = selected ? faultImpact.propagation_comparison.find((item) => item.predicted_effect === selected.predicted_effect) : null;
  return (
    <Card size="small" title="故障传播因果链" data-testid="propagation-cause-chain">
      <Typography.Paragraph type="secondary">概率与时延沿用后端整条传播路径的累计口径，仅在链末端和详情中展示。</Typography.Paragraph>
      <div className="propagation-chain-list">
        {predictions.map((prediction) => {
          const path = parsePath(prediction);
          return (
            <button type="button" className={`propagation-chain ${keyOf(prediction) === keyOf(selected) ? "is-selected" : ""}`} key={keyOf(prediction)} onClick={() => setSelectedKey(keyOf(prediction))}>
              {path.map((eventId, index) => (
                <span className="propagation-event-wrap" key={`${eventId}:${index}`}>
                  <span className="propagation-event"><strong>{propagationEventDisplayName(eventId)}</strong><small>内部 ID：{eventId}</small></span>
                  {index < path.length - 1 ? <i aria-hidden="true">↓</i> : null}
                </span>
              ))}
              <span className="propagation-cumulative">累计概率 {formatSimulationNumber(prediction.predicted_probability)}；累计时延 {formatSimulationNumber(prediction.predicted_delay_ms)} ms</span>
            </button>
          );
        })}
      </div>
      {selected ? (
        <Descriptions size="small" bordered column={2} className="compact-descriptions">
          <Descriptions.Item label="根故障">{propagationEventDisplayName(selected.root_fault)}（{selected.root_fault}）</Descriptions.Item>
          <Descriptions.Item label="末端影响">{propagationEventDisplayName(selected.predicted_effect)}（{selected.predicted_effect}）</Descriptions.Item>
          <Descriptions.Item label="所属层级">{stageDisplayName(selected.predicted_layer)}</Descriptions.Item>
          <Descriptions.Item label="是否观察到"><Tag color={comparison?.observed ? "success" : "default"}>{comparison?.observed ? "已观察到" : "未观察到"}</Tag></Descriptions.Item>
          <Descriptions.Item label="累计预测概率">{formatSimulationNumber(selected.predicted_probability)}</Descriptions.Item>
          <Descriptions.Item label="累计预测时延">{formatSimulationNumber(selected.predicted_delay_ms)} ms</Descriptions.Item>
          <Descriptions.Item label="观测时延">{formatSimulationNumber(observed?.observed_delay_ms ?? null)} ms</Descriptions.Item>
          <Descriptions.Item label="预测—观测误差">{formatSimulationNumber(comparison?.delay_error_pct ?? null)} %</Descriptions.Item>
          <Descriptions.Item label="观测证据" span={2}>{observed ? engineeringTextDisplayName(observed.evidence) : "当前未返回观测证据"}</Descriptions.Item>
        </Descriptions>
      ) : null}
    </Card>
  );
}

function parsePath(prediction: PropagationPredictionResponse): string[] {
  const path = prediction.propagation_path.split(/\s*(?:->|→)\s*/).filter(Boolean);
  if (!path.length) return [prediction.root_fault, prediction.predicted_effect];
  if (path[0] !== prediction.root_fault) path.unshift(prediction.root_fault);
  if (path.at(-1) !== prediction.predicted_effect) path.push(prediction.predicted_effect);
  return path;
}

function keyOf(prediction: PropagationPredictionResponse | null): string {
  return prediction ? `${prediction.root_fault}:${prediction.predicted_effect}:${prediction.propagation_path}` : "";
}
