import type { GraphSnapshotResponse, LinkPayload, NodePayload, RouteSnapshotItemResponse } from "../../api/contracts";
import { UnifiedLunarNetworkGraph } from "../topology/unified/UnifiedLunarNetworkGraph";

export interface UnifiedStageTopologyGraphProps {
  snapshot: GraphSnapshotResponse;
  projectNodes: NodePayload[];
  projectLinks: LinkPayload[];
  selectedRoute?: RouteSnapshotItemResponse;
  selectedNodeIds?: string[];
  selectedLinkIds?: string[];
  stage: "nominal" | "before_healing" | "healing_executed" | "after_healing";
  onNodeClick?: (nodeId: string) => void;
  onLinkClick?: (linkId: string) => void;
}

export function UnifiedStageTopologyGraph(props: UnifiedStageTopologyGraphProps) {
  return (
    <UnifiedLunarNetworkGraph
      {...props}
      selectedServiceId={props.selectedRoute?.service_id}
      showLinkLabels
      className="stage-topology-graph"
    />
  );
}
