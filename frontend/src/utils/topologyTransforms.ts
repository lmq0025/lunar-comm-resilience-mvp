import type { Edge } from "@xyflow/react";
import type { LinkPayload, NodePayload, ScenarioPayload } from "../api/contracts";
import type { TopologyEditorState, TopologyFlowEdge, TopologyFlowNode } from "../types/topology";

export function scenarioNodeToFlowNode(node: NodePayload, index = 0): TopologyFlowNode {
  const x = typeof node.position_x === "number" ? node.position_x : 120 + (index % 4) * 190;
  const y = typeof node.position_y === "number" ? node.position_y : 80 + Math.floor(index / 4) * 130;
  return {
    id: node.id,
    type: "lunarNode",
    position: { x, y },
    data: {
      payload: { ...node },
      label: node.name || node.id
    }
  };
}

export function flowNodeToScenarioNode(node: TopologyFlowNode): NodePayload {
  return {
    ...node.data.payload,
    position_x: Math.round(node.position.x),
    position_y: Math.round(node.position.y)
  };
}

export function scenarioLinkToFlowEdge(link: LinkPayload, index = 0): TopologyFlowEdge {
  const id = link.id || `${link.source}__${link.target}__${index}`;
  return {
    id,
    source: link.source,
    target: link.target,
    type: "default",
    label: `${link.bandwidth_mbps} Mbps | ${link.delay_ms} ms | A=${link.availability}`,
    style: link.active === false ? { strokeDasharray: "6 5", stroke: "#9aa5ad" } : undefined,
    data: {
      payload: { ...link, id },
      label: `${link.bandwidth_mbps} Mbps | ${link.delay_ms} ms | A=${link.availability}`
    }
  };
}

export function flowEdgeToScenarioLink(edge: TopologyFlowEdge): LinkPayload {
  const payload = getEdgePayload(edge);
  if (!payload) {
    throw new Error(`Edge ${edge.id} is missing link payload`);
  }
  return {
    ...payload,
    id: edge.id,
    source: edge.source,
    target: edge.target
  };
}

export function projectToEditorState(scenario: ScenarioPayload): TopologyEditorState {
  const nodes = Array.isArray(scenario?.nodes) ? scenario.nodes.filter(isUsableNode) : [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const links = Array.isArray(scenario?.links)
    ? scenario.links.filter((link) => isUsableLink(link) && nodeIds.has(link.source) && nodeIds.has(link.target))
    : [];
  return {
    nodes: nodes.map(scenarioNodeToFlowNode),
    edges: links.map(scenarioLinkToFlowEdge)
  };
}

export function topologyWarnings(scenario: ScenarioPayload): string[] {
  const rawNodes = Array.isArray(scenario?.nodes) ? scenario.nodes : [];
  const rawLinks = Array.isArray(scenario?.links) ? scenario.links : [];
  const nodes = rawNodes.filter(isUsableNode);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const invalidNodeCount = rawNodes.length - nodes.length;
  const invalidLinks = rawLinks.filter(
    (link) => !isUsableLink(link) || !nodeIds.has(link.source) || !nodeIds.has(link.target)
  );
  const warnings: string[] = [];
  if (invalidNodeCount) warnings.push(`已跳过 ${invalidNodeCount} 个字段不完整的节点`);
  if (invalidLinks.length) warnings.push(`已跳过 ${invalidLinks.length} 条端点不存在或字段不完整的链路`);
  return warnings;
}

export function editorStateToScenario(base: ScenarioPayload, state: TopologyEditorState): ScenarioPayload {
  return {
    ...base,
    nodes: state.nodes.map(flowNodeToScenarioNode),
    links: state.edges.map(flowEdgeToScenarioLink)
  };
}

export function isDuplicateLink(edges: Edge[], source: string, target: string): boolean {
  return edges.some((edge) => sameUndirectedPair(edge.source, edge.target, source, target));
}

export function removeLinksForNode(edges: TopologyFlowEdge[], nodeId: string): TopologyFlowEdge[] {
  return edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
}

export function updateNodePayload(nodes: TopologyFlowNode[], nodeId: string, payload: NodePayload): TopologyFlowNode[] {
  return nodes.map((node) =>
    node.id === nodeId
      ? {
          ...node,
          position: {
            x: typeof payload.position_x === "number" ? payload.position_x : node.position.x,
            y: typeof payload.position_y === "number" ? payload.position_y : node.position.y
          },
          data: { payload, label: payload.name || payload.id }
        }
      : node
  );
}

export function updateEdgePayload(edges: TopologyFlowEdge[], edgeId: string, payload: LinkPayload): TopologyFlowEdge[] {
  return edges.map((edge) =>
    edge.id === edgeId
      ? {
          ...edge,
          source: payload.source,
          target: payload.target,
          label: payload.name || payload.kind,
          data: { payload, label: payload.name || payload.kind }
        }
      : edge
  );
}

export function getEdgePayload(edge: TopologyFlowEdge): LinkPayload | null {
  return edge.data?.payload ?? null;
}

function sameUndirectedPair(aSource: string, aTarget: string, bSource: string, bTarget: string): boolean {
  return (aSource === bSource && aTarget === bTarget) || (aSource === bTarget && aTarget === bSource);
}

function isUsableNode(value: unknown): value is NodePayload {
  return typeof value === "object" && value !== null && "id" in value && typeof (value as { id?: unknown }).id === "string";
}

function isUsableLink(value: unknown): value is LinkPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "source" in value &&
    "target" in value &&
    typeof (value as { source?: unknown }).source === "string" &&
    typeof (value as { target?: unknown }).target === "string"
  );
}
