import type { Edge, Node } from "@xyflow/react";
import type { LinkPayload, NodePayload } from "../api/generated/openapi";

export interface TopologyNodeData extends Record<string, unknown> {
  payload: NodePayload;
  label: string;
  routeBadge?: string;
  visualState?: "normal" | "target" | "route" | "failed" | "recovered";
  stageLabel?: string;
}

export interface TopologyEdgeData extends Record<string, unknown> {
  payload: LinkPayload;
  label: string;
  visualState?: "normal" | "degraded" | "failed" | "route" | "recovered" | "selected";
  serviceName?: string;
  routeSource?: string;
  routePath?: string[];
  totalDelayMs?: number | null;
  bottleneckBandwidthMbps?: number | null;
  showLabel?: boolean;
}

export type TopologyFlowNode = Node<TopologyNodeData>;
export type TopologyFlowEdge = Edge<TopologyEdgeData>;

export interface TopologyEditorState {
  nodes: TopologyFlowNode[];
  edges: TopologyFlowEdge[];
}

export interface SelectedElement {
  kind: "node" | "edge";
  id: string;
}
