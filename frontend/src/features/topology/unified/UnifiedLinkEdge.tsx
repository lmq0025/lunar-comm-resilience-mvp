import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { linkTypeDisplayName, routeSourceDisplayName } from "../../../i18n/displayNames";
import type { TopologyFlowEdge } from "../../../types/topology";

export function UnifiedLinkEdge(props: EdgeProps<TopologyFlowEdge>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, selected } = props;
  const curvature = 0.2 + (stableOffset(props.id) % 4) * 0.05;
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature });
  const state = selected ? "selected" : data?.visualState ?? "normal";
  const payload = data?.payload;
  const tooltip = payload
    ? `${data?.serviceName ? `业务：${data.serviceName}\n` : ""}${linkTypeDisplayName(payload.kind)}\n源节点：${payload.source}\n目标节点：${payload.target}${data?.routePath?.length ? `\n完整路径：${data.routePath.join(" → ")}` : ""}\n带宽：${data?.bottleneckBandwidthMbps ?? payload.bandwidth_mbps} Mbps\n端到端时延：${data?.totalDelayMs ?? payload.delay_ms} ms${data?.routeSource ? `\n路由来源：${routeSourceDisplayName(data.routeSource)}` : ""}`
    : props.id;
  return (
    <>
      <title>{tooltip}</title>
      <BaseEdge id={props.id} path={path} markerEnd={markerEnd} className={`unified-edge is-${state}`} />
      {data?.showLabel ? (
        <EdgeLabelRenderer>
          <div className={`unified-edge-label is-${state}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
            {payload ? linkTypeDisplayName(payload.kind) : data.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

function stableOffset(id: string): number {
  return Array.from(id).reduce((total, character) => total + character.charCodeAt(0), 0);
}
