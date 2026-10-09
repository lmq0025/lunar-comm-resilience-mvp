import type { GraphSnapshotResponse, LinkPayload, NodePayload, RouteSnapshotItemResponse } from "../../../api/contracts";
import { linkTypeDisplayName, nodeDisplayName, serviceDisplayName, stageDisplayName } from "../../../i18n/displayNames";
import type { TopologyFlowEdge, TopologyFlowNode } from "../../../types/topology";
import { deterministicLayeredLayout, resolveNodePosition } from "./topologyLayout";

export type TopologyStage = "editor" | "service" | "fault_plan" | "nominal" | "before_healing" | "healing_executed" | "after_healing" | "results";

export interface TopologyStageAdapterInput {
  projectNodes: NodePayload[];
  projectLinks: LinkPayload[];
  snapshot?: GraphSnapshotResponse | null;
  stage: TopologyStage;
  selectedRoute?: RouteSnapshotItemResponse;
  selectedServiceId?: string | null;
  highlightedNodeIds?: string[];
  highlightedLinkIds?: string[];
  degradedLinkIds?: Array<string | null>;
  showLinkLabels?: boolean;
}

export interface UnifiedTopologyModel {
  nodes: TopologyFlowNode[];
  edges: TopologyFlowEdge[];
  warnings: string[];
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
  packet_loss_rate?: number;
}

export function adaptTopologyStage(input: TopologyStageAdapterInput): UnifiedTopologyModel {
  const warnings: string[] = [];
  const projectNodes = Array.isArray(input.projectNodes) ? input.projectNodes : [];
  const projectLinks = Array.isArray(input.projectLinks) ? input.projectLinks : [];
  const projectNodeMap = new Map(projectNodes.map((node) => [node.id, node]));
  const rawSnapshotNodes = Array.isArray(input.snapshot?.nodes) ? input.snapshot.nodes as SnapshotNode[] : [];
  const sourceNodes = rawSnapshotNodes.length ? rawSnapshotNodes : projectNodes;
  const layoutNodes = sourceNodes
    .filter((node): node is SnapshotNode & { id: string } => typeof node.id === "string" && Boolean(node.id))
    .map((node) => mergeNode(projectNodeMap.get(node.id), node));
  const layout = deterministicLayeredLayout(layoutNodes);
  const routeNodes = new Set(input.selectedRoute?.path ?? []);
  const routeEdges = new Set(pathEdgeKeys(input.selectedRoute?.path ?? []));
  const highlightedNodes = new Set(input.highlightedNodeIds ?? []);
  const highlightedLinks = new Set((input.highlightedLinkIds ?? []).filter(Boolean));
  const degradedLinks = new Set((input.degradedLinkIds ?? []).filter((id): id is string => Boolean(id)));

  const nodes: TopologyFlowNode[] = layoutNodes.map((payload) => {
    const point = resolveNodePosition(payload, layout, true);
    const failed = isActuallyFailed(payload, input.stage);
    const inRoute = routeNodes.has(payload.id);
    const target = highlightedNodes.has(payload.id);
    return {
      id: payload.id,
      type: "lunarNode",
      position: { x: point.x, y: point.y },
      data: {
        payload,
        label: nodeDisplayName(payload),
        routeBadge: inRoute ? (input.stage === "after_healing" || input.stage === "results" ? "恢复路径" : "当前路径") : undefined,
        visualState: failed ? "failed" : target ? "target" : inRoute ? recoveredState(input) : "normal",
        stageLabel: stageDisplayName(input.stage)
      },
      selected: target
    };
  });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const rawSnapshotLinks = Array.isArray(input.snapshot?.links) ? input.snapshot.links as SnapshotLink[] : [];
  const sourceLinks = rawSnapshotLinks.length ? rawSnapshotLinks : projectLinks;
  const edges: TopologyFlowEdge[] = [];
  sourceLinks.forEach((rawLink, index) => {
    if (!rawLink.source || !rawLink.target || !nodeIds.has(rawLink.source) || !nodeIds.has(rawLink.target)) {
      warnings.push(`已跳过端点不存在的链路：${rawLink.id ?? `${rawLink.source ?? "?"}-${rawLink.target ?? "?"}`}`);
      return;
    }
    const projectLink = findProjectLink(projectLinks, rawLink.source, rawLink.target);
    const payload = mergeLink(projectLink, rawLink);
    const id = String(rawLink.id ?? projectLink?.id ?? `${rawLink.source}__${rawLink.target}__${index}`);
    const inRoute = routeEdges.has(edgeKey(rawLink.source, rawLink.target));
    const failed = isLinkFailed(payload, input.stage);
    const degraded = !failed && (degradedLinks.has(id) || (payload.availability > 0 && payload.availability < 0.999));
    const selected = highlightedLinks.has(id);
    const visualState = selected
      ? "selected"
      : failed
        ? "failed"
        : inRoute
          ? recoveredState(input)
          : degraded
            ? "degraded"
            : "normal";
    edges.push({
      id,
      ariaLabel: `链路 ${nodeDisplayName(rawLink.source)} 至 ${nodeDisplayName(rawLink.target)}`,
      source: rawLink.source,
      target: rawLink.target,
      type: "unifiedLink",
      data: {
        payload,
        label: linkTypeDisplayName(payload.kind),
        visualState,
        serviceName: input.selectedServiceId ? serviceDisplayName(input.selectedServiceId) : undefined,
        routeSource: input.selectedRoute?.route_source ?? undefined,
        routePath: input.selectedRoute?.path,
        totalDelayMs: input.selectedRoute?.total_delay_ms,
        bottleneckBandwidthMbps: input.selectedRoute?.bottleneck_bandwidth_mbps,
        showLabel: Boolean(input.showLinkLabels && (inRoute || selected))
      },
      selected,
      animated: Boolean(inRoute && input.selectedRoute?.valid && visualState !== "failed")
    });
  });

  return { nodes, edges, warnings: Array.from(new Set(warnings)) };
}

function recoveredState(input: TopologyStageAdapterInput): "route" | "recovered" {
  return input.stage === "after_healing" || input.stage === "results" ? "recovered" : "route";
}

function isActuallyFailed(node: NodePayload, stage: TopologyStage): boolean {
  if (["editor", "service", "fault_plan", "nominal"].includes(stage)) return false;
  return node.active === false || node.availability === 0;
}

function isLinkFailed(link: LinkPayload, stage: TopologyStage): boolean {
  if (["editor", "service", "fault_plan", "nominal"].includes(stage)) return false;
  return link.active === false || link.availability === 0;
}

function mergeNode(projectNode: NodePayload | undefined, snapshotNode: SnapshotNode): NodePayload {
  return {
    id: String(snapshotNode.id ?? projectNode?.id ?? "unknown_node"),
    type: snapshotNode.type ?? projectNode?.type ?? "payload",
    role: snapshotNode.role ?? projectNode?.role ?? "unknown_role",
    ...projectNode,
    ...snapshotNode
  };
}

function mergeLink(projectLink: LinkPayload | undefined, snapshotLink: SnapshotLink): LinkPayload {
  return {
    source: String(snapshotLink.source ?? projectLink?.source ?? ""),
    target: String(snapshotLink.target ?? projectLink?.target ?? ""),
    kind: snapshotLink.kind ?? projectLink?.kind ?? "local",
    bandwidth_mbps: Number(snapshotLink.bandwidth_mbps ?? projectLink?.bandwidth_mbps ?? 0),
    delay_ms: Number(snapshotLink.delay_ms ?? projectLink?.delay_ms ?? 0),
    packet_loss_rate: Number(snapshotLink.packet_loss_rate ?? projectLink?.packet_loss_rate ?? 0),
    availability: Number(snapshotLink.availability ?? projectLink?.availability ?? 1),
    ...projectLink,
    ...snapshotLink
  };
}

function findProjectLink(links: LinkPayload[], source: string, target: string): LinkPayload | undefined {
  return links.find((link) => edgeKey(link.source, link.target) === edgeKey(source, target));
}

function pathEdgeKeys(path: string[]): string[] {
  return path.slice(0, -1).map((source, index) => edgeKey(source, path[index + 1]));
}

function edgeKey(source: string, target: string): string {
  return [source, target].sort().join("__");
}
