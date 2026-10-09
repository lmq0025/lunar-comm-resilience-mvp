import { useEffect, useMemo, useRef } from "react";
import { FullscreenOutlined } from "@ant-design/icons";
import { Alert, App, Button } from "antd";
import { Controls, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import type { GraphSnapshotResponse, LinkPayload, NodePayload, RouteSnapshotItemResponse } from "../../../api/contracts";
import { lunarNodeTypes } from "../nodeTypes";
import { computeSelectionCenter } from "../../simulation/stageTopologyGraphModel";
import { TopologyLayerBands } from "./TopologyLayerBands";
import { TopologyLegend } from "./TopologyLegend";
import { adaptTopologyStage, type TopologyStage } from "./TopologyStageAdapter";
import { UnifiedLinkEdge } from "./UnifiedLinkEdge";
import { CHINESE_REACT_FLOW_LABELS } from "./reactFlowLabels";

const edgeTypes = { unifiedLink: UnifiedLinkEdge };

export interface UnifiedLunarNetworkGraphProps {
  projectNodes: NodePayload[];
  projectLinks: LinkPayload[];
  snapshot?: GraphSnapshotResponse | null;
  selectedRoute?: RouteSnapshotItemResponse;
  selectedServiceId?: string | null;
  selectedNodeIds?: string[];
  selectedLinkIds?: string[];
  degradedLinkIds?: Array<string | null>;
  stage: TopologyStage;
  onNodeClick?: (nodeId: string) => void;
  onLinkClick?: (linkId: string) => void;
  className?: string;
  showLinkLabels?: boolean;
}

export function UnifiedLunarNetworkGraph(props: UnifiedLunarNetworkGraphProps) {
  return <ReactFlowProvider><UnifiedLunarNetworkGraphInner {...props} /></ReactFlowProvider>;
}

function UnifiedLunarNetworkGraphInner({
  projectNodes,
  projectLinks,
  snapshot,
  selectedRoute,
  selectedServiceId,
  selectedNodeIds = [],
  selectedLinkIds = [],
  degradedLinkIds = [],
  stage,
  onNodeClick,
  onLinkClick,
  className = "",
  showLinkLabels = false
}: UnifiedLunarNetworkGraphProps) {
  const { message } = App.useApp();
  const reactFlow = useReactFlow();
  const model = useMemo(() => adaptTopologyStage({
    projectNodes,
    projectLinks,
    snapshot,
    selectedRoute,
    selectedServiceId,
    highlightedNodeIds: selectedNodeIds,
    highlightedLinkIds: selectedLinkIds,
    degradedLinkIds,
    stage,
    showLinkLabels
  }), [degradedLinkIds, projectLinks, projectNodes, selectedLinkIds, selectedNodeIds, selectedRoute, selectedServiceId, showLinkLabels, snapshot, stage]);
  const selectionKey = selectedNodeIds[0] ? `node:${selectedNodeIds[0]}` : selectedLinkIds[0] ? `link:${selectedLinkIds[0]}` : "";
  const lastSelection = useRef("");

  useEffect(() => {
    if (!selectionKey || selectionKey === lastSelection.current) return;
    lastSelection.current = selectionKey;
    const center = computeSelectionCenter(model.nodes, model.edges, selectedNodeIds, selectedLinkIds);
    if (!center) {
      message.warning("对象不存在或无法定位");
      return;
    }
    void reactFlow.setCenter(center.x, center.y, { zoom: 1.1, duration: 350 });
  }, [message, model.edges, model.nodes, reactFlow, selectedLinkIds, selectedNodeIds, selectionKey]);

  return (
    <div className={`unified-topology ${className}`} data-testid={`unified-topology-${stage}`}>
      <TopologyLayerBands />
      {model.warnings.length ? <Alert className="unified-topology-warning" type="warning" showIcon message={model.warnings.join("；")} /> : null}
      <ReactFlow
        ariaLabelConfig={CHINESE_REACT_FLOW_LABELS}
        nodes={model.nodes}
        edges={model.edges}
        nodeTypes={lunarNodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.25}
        maxZoom={1.8}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onEdgeClick={(_, edge) => onLinkClick?.(String(edge.data?.payload?.id ?? edge.id))}
      >
        <Controls />
        <MiniMap pannable zoomable nodeStrokeWidth={3} />
        <Panel position="top-right">
          <Button size="small" icon={<FullscreenOutlined />} onClick={() => reactFlow.fitView({ padding: 0.16, duration: 300 })}>重置视图</Button>
        </Panel>
      </ReactFlow>
      <TopologyLegend />
    </div>
  );
}
