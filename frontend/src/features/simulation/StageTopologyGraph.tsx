import { useMemo } from "react";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import type { GraphSnapshotResponse, LinkPayload, NodePayload, RouteSnapshotItemResponse } from "../../api/contracts";

export interface StageTopologyGraphProps {
  snapshot: GraphSnapshotResponse;
  projectNodes: NodePayload[];
  projectLinks: LinkPayload[];
  selectedRoute?: RouteSnapshotItemResponse;
  selectedNodeIds?: string[];
  selectedLinkIds?: string[];
  stage: "nominal" | "before_healing";
  onNodeClick?: (nodeId: string) => void;
  onLinkClick?: (linkId: string) => void;
}

interface SnapshotNode {
  id?: string;
  name?: string | null;
  type?: string;
  role?: string;
  active?: boolean;
  availability?: number;
  position_x?: number | null;
  position_y?: number | null;
}

interface SnapshotLink {
  id?: string | null;
  source?: string;
  target?: string;
  kind?: string;
  active?: boolean;
  availability?: number;
  bandwidth_mbps?: number;
  delay_ms?: number;
}

export function StageTopologyGraph(props: StageTopologyGraphProps) {
  return (
    <ReactFlowProvider>
      <StageTopologyGraphInner {...props} />
    </ReactFlowProvider>
  );
}

function StageTopologyGraphInner({
  snapshot,
  projectNodes,
  projectLinks,
  selectedRoute,
  selectedNodeIds = [],
  selectedLinkIds = [],
  stage,
  onNodeClick,
  onLinkClick
}: StageTopologyGraphProps) {
  const graph = useMemo(
    () => buildFlow(snapshot, projectNodes, projectLinks, selectedRoute, selectedNodeIds, selectedLinkIds),
    [projectLinks, projectNodes, selectedLinkIds, selectedNodeIds, selectedRoute, snapshot]
  );

  return (
    <div className="stage-topology-graph" data-testid={`stage-topology-${stage}`}>
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        minZoom={0.25}
        maxZoom={1.8}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onEdgeClick={(_, edge) => onLinkClick?.(String(edge.data?.linkId ?? edge.id))}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <div className="stage-topology-legend">
        <span><i className="legend-dot normal" />正常节点</span>
        <span><i className="legend-dot route" />选中路径</span>
        {stage === "before_healing" ? (
          <>
            <span><i className="legend-dot failed" />失效节点/链路</span>
            <span><i className="legend-dot degraded" />退化链路</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function buildFlow(
  snapshot: GraphSnapshotResponse,
  projectNodes: NodePayload[],
  projectLinks: LinkPayload[],
  selectedRoute: RouteSnapshotItemResponse | undefined,
  selectedNodeIds: string[],
  selectedLinkIds: string[]
): { nodes: Node[]; edges: Edge[] } {
  const projectNodeMap = new Map(projectNodes.map((node) => [node.id, node]));
  const routeNodeIds = new Set(selectedRoute?.path ?? []);
  const routeEdges = new Set(routeEdgeKeys(selectedRoute?.path ?? []));
  const selectedNodes = new Set(selectedNodeIds);
  const selectedLinks = new Set(selectedLinkIds.filter(Boolean));
  const snapshotNodes = (snapshot.nodes as SnapshotNode[]).filter((node) => node.id);

  const nodes = snapshotNodes.map((node, index) => {
    const projectNode = projectNodeMap.get(String(node.id));
    const active = node.active !== false && node.availability !== 0;
    const inRoute = routeNodeIds.has(String(node.id));
    const selected = selectedNodes.has(String(node.id));
    return {
      id: String(node.id),
      position: fallbackPosition(projectNode, node, index, snapshotNodes.length),
      data: { label: node.name ? `${node.name}\n${node.id}` : String(node.id) },
      className: [
        "stage-topology-node",
        active ? "active" : "failed",
        inRoute ? "route" : "",
        selected ? "selected" : ""
      ].filter(Boolean).join(" "),
      style: {
        border: selected ? "3px solid #1677ff" : inRoute ? "2px solid #1677ff" : active ? "1px solid #7a8aa0" : "2px solid #cf1322",
        background: active ? (inRoute ? "#e6f4ff" : "#ffffff") : "#fff1f0",
        color: "#1f2937",
        width: 112,
        minHeight: 46,
        borderRadius: 6,
        fontSize: 12,
        whiteSpace: "pre-line",
        textAlign: "center",
        opacity: selectedRoute && !inRoute ? 0.55 : 1
      }
    } satisfies Node;
  });

  const edges = (snapshot.links as SnapshotLink[])
    .filter((link) => link.source && link.target)
    .map((link, index) => {
      const linkId = String(link.id || projectLinkId(projectLinks, String(link.source), String(link.target), index));
      const active = link.active !== false && link.availability !== 0;
      const degraded = active && finite(link.availability) != null && Number(link.availability) < 0.999;
      const inRoute = routeEdges.has(edgeKey(String(link.source), String(link.target)));
      const selected = selectedLinks.has(linkId);
      const color = !active ? "#cf1322" : degraded ? "#d46b08" : inRoute ? "#1677ff" : "#667085";
      return {
        id: linkId,
        source: String(link.source),
        target: String(link.target),
        label: link.kind ?? linkId,
        data: { linkId },
        animated: Boolean(inRoute && selectedRoute?.valid),
        style: {
          stroke: color,
          strokeWidth: selected ? 4 : inRoute ? 3 : 1.8,
          strokeDasharray: !active ? "7 5" : undefined,
          opacity: selectedRoute && !inRoute ? 0.45 : 1
        },
        labelStyle: { fontSize: 10, fill: color },
        className: [
          "stage-topology-link",
          active ? "active" : "failed",
          degraded ? "degraded" : "",
          inRoute ? "route" : "",
          selected ? "selected" : ""
        ].filter(Boolean).join(" ")
      } satisfies Edge;
    });

  return { nodes, edges };
}

function fallbackPosition(projectNode: NodePayload | undefined, snapshotNode: SnapshotNode, index: number, total: number) {
  if (projectNode?.position_x != null && projectNode.position_y != null) {
    return { x: Number(projectNode.position_x), y: Number(projectNode.position_y) };
  }
  if (snapshotNode.position_x != null && snapshotNode.position_y != null) {
    return { x: Number(snapshotNode.position_x), y: Number(snapshotNode.position_y) };
  }
  const radius = Math.max(180, total * 18);
  const angle = (2 * Math.PI * index) / Math.max(total, 1);
  return { x: Math.cos(angle) * radius + radius, y: Math.sin(angle) * radius + radius };
}

function routeEdgeKeys(path: string[]): string[] {
  const keys: string[] = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    keys.push(edgeKey(path[index], path[index + 1]));
  }
  return keys;
}

function edgeKey(source: string, target: string): string {
  return [source, target].sort().join("__");
}

function projectLinkId(projectLinks: LinkPayload[], source: string, target: string, index: number): string {
  const match = projectLinks.find((link) => edgeKey(link.source, link.target) === edgeKey(source, target));
  return match?.id || `${source}__${target}__${index}`;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
