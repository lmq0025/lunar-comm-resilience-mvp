import type { RouteSnapshotItemResponse } from "../../api/contracts";
import type { TopologyFlowEdge, TopologyFlowNode } from "../../types/topology";

const ROUTE_EDGE_STYLE = { stroke: "#1677ff", strokeWidth: 4 };
const DIMMED_EDGE_STYLE = { opacity: 0.22 };
const DIMMED_NODE_STYLE = { opacity: 0.28 };

export function routeEdgeKey(source: string, target: string): string {
  return [source, target].sort().join("::");
}

export function edgeKeysForPath(path: string[]): Set<string> {
  const keys = new Set<string>();
  for (let index = 0; index < path.length - 1; index += 1) {
    keys.add(routeEdgeKey(path[index], path[index + 1]));
  }
  return keys;
}

export function applyRouteHighlight(
  nodes: TopologyFlowNode[],
  edges: TopologyFlowEdge[],
  route: RouteSnapshotItemResponse | null
): { nodes: TopologyFlowNode[]; edges: TopologyFlowEdge[] } {
  if (!route?.valid || route.path.length === 0) {
    return { nodes, edges };
  }
  const routeNodes = new Set(route.path);
  const routeEdges = edgeKeysForPath(route.path);
  return {
    nodes: nodes.map((node) => {
      const inPath = routeNodes.has(node.id);
      const badge =
        node.id === route.source
          ? "源"
          : node.id === route.target
            ? "目标"
            : undefined;
      return {
        ...node,
        style: inPath ? node.style : { ...node.style, ...DIMMED_NODE_STYLE },
        data: { ...node.data, routeBadge: badge }
      };
    }),
    edges: edges.map((edge) => {
      const inPath = routeEdges.has(routeEdgeKey(edge.source, edge.target));
      return {
        ...edge,
        style: inPath ? { ...edge.style, ...ROUTE_EDGE_STYLE } : { ...edge.style, ...DIMMED_EDGE_STYLE },
        animated: inPath
      };
    })
  };
}
