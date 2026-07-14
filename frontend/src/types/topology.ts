import type { Edge, Node } from "@xyflow/react";
import type { LinkPayload, NodePayload } from "../api/generated/openapi";

export interface TopologyNodeData extends Record<string, unknown> {
  payload: NodePayload;
  label: string;
  routeBadge?: string;
}

export interface TopologyEdgeData extends Record<string, unknown> {
  payload: LinkPayload;
  label: string;
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
