import { Handle, Position, type NodeProps } from "@xyflow/react";
import { nodeDisplayName, nodeTypeDisplayName } from "../../../i18n/displayNames";
import type { TopologyFlowNode } from "../../../types/topology";
import { DeviceGlyph } from "./DeviceGlyph";

export function UnifiedLunarNode({ data, selected }: NodeProps<TopologyFlowNode>) {
  const payload = data.payload;
  const failed = data.visualState ? data.visualState === "failed" : payload.active === false;
  const state = failed ? "failed" : data.visualState ?? "normal";
  const label = nodeDisplayName(payload);
  return (
    <div
      className={`unified-node unified-node-${payload.type} is-${state} ${selected ? "is-selected" : ""}`}
      title={`${label}\n内部 ID：${payload.id}\n类型：${nodeTypeDisplayName(payload.type)}\n状态：${failed ? "失效" : "正常"}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="unified-node-main">
        <DeviceGlyph type={payload.type} className="unified-device-glyph" />
        <div className="unified-node-copy">
          <strong>{label}</strong>
          <span>{nodeTypeDisplayName(payload.type)}</span>
        </div>
        {failed ? <span className="unified-node-failure" aria-label="设备失效">!</span> : null}
      </div>
      <div className="unified-node-meta">
        <span>{data.routeBadge ?? (failed ? "设备失效" : "运行正常")}</span>
        {data.stageLabel ? <span>{data.stageLabel}</span> : null}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
