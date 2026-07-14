import dagre from "dagre";
import type { TopologyFlowEdge, TopologyFlowNode } from "../types/topology";

const NODE_WIDTH = 150;
const NODE_HEIGHT = 48;

export function autoLayout(nodes: TopologyFlowNode[], edges: TopologyFlowEdge[]): TopologyFlowNode[] {
  if (nodes.length === 0) {
    return [];
  }
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "TB", nodesep: 70, ranksep: 95 });

  nodes.forEach((node) => graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  return nodes.map((node) => {
    const point = graph.node(node.id) as { x: number; y: number } | undefined;
    if (!point) {
      return node;
    }
    return {
      ...node,
      position: {
        x: Math.round(point.x - NODE_WIDTH / 2),
        y: Math.round(point.y - NODE_HEIGHT / 2)
      }
    };
  });
}
