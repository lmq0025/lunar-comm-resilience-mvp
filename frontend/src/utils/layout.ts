import type { TopologyFlowEdge, TopologyFlowNode } from "../types/topology";
import { applyLayeredCoordinates } from "../features/topology/unified/topologyLayout";

export function autoLayout(nodes: TopologyFlowNode[], edges: TopologyFlowEdge[]): TopologyFlowNode[] {
  void edges;
  const positioned = new Map(applyLayeredCoordinates(nodes.map((node) => node.data.payload)).map((node) => [node.id, node]));
  return nodes.map((node) => {
    const payload = positioned.get(node.id);
    if (!payload || typeof payload.position_x !== "number" || typeof payload.position_y !== "number") return node;
    return { ...node, position: { x: payload.position_x, y: payload.position_y }, data: { ...node.data, payload } };
  });
}
