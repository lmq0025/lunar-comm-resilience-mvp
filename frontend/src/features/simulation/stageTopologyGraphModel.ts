import type { Edge, Node } from "@xyflow/react";

export const LINK_HIGH_AVAILABILITY_DISPLAY_THRESHOLD = 0.999;

export function stageLinkStrokeColor(active: boolean, inRoute: boolean, lowAvailability: boolean): string {
  if (!active) return "#cf1322";
  if (inRoute) return "#1677ff";
  if (lowAvailability) return "#d46b08";
  return "#667085";
}

export function computeSelectionCenter(nodes: Node[], edges: Edge[], selectedNodeIds: string[] = [], selectedLinkIds: string[] = []): { x: number; y: number } | null {
  const selectedNodeId = selectedNodeIds[0];
  if (selectedNodeId) {
    const node = nodes.find((item) => item.id === selectedNodeId);
    return node ? node.position : null;
  }

  const selectedLinkId = selectedLinkIds[0];
  if (selectedLinkId) {
    const edge = edges.find((item) => String(item.data?.linkId ?? item.id) === selectedLinkId);
    if (!edge) return null;
    const source = nodes.find((item) => item.id === edge.source);
    const target = nodes.find((item) => item.id === edge.target);
    if (!source || !target) return null;
    return {
      x: (source.position.x + target.position.x) / 2,
      y: (source.position.y + target.position.y) / 2
    };
  }

  return null;
}
