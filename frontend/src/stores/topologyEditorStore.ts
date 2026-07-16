import { addEdge, applyNodeChanges, type EdgeChange, type NodeChange } from "@xyflow/react";
import { create } from "zustand";
import type { LinkPayload, NodePayload, ScenarioPayload } from "../api/contracts";
import type { SelectedElement, TopologyEditorState, TopologyFlowEdge, TopologyFlowNode } from "../types/topology";
import { autoLayout } from "../utils/layout";
import {
  editorStateToScenario,
  getEdgePayload,
  isDuplicateLink,
  projectToEditorState,
  removeLinksForNode,
  topologyWarnings,
  updateEdgePayload,
  updateNodePayload
} from "../utils/topologyTransforms";
import { useProjectStore } from "./projectStore";
import { useServiceRoutingStore } from "./serviceRoutingStore";

interface TopologyEditorStoreState extends TopologyEditorState {
  selected: SelectedElement | null;
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  primarySelection: SelectedElement | null;
  past: TopologyEditorState[];
  future: TopologyEditorState[];
  dragStartSnapshot: TopologyEditorState | null;
  warnings: string[];
  loadScenario: (scenario: ScenarioPayload) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  addNode: (type: string, role: string, position?: { x: number; y: number }) => void;
  beginNodeDrag: () => void;
  finishNodeDrag: (nodeId: string, position: { x: number; y: number }) => void;
  addLink: (payload: LinkPayload) => boolean;
  updateNode: (nodeId: string, payload: NodePayload) => void;
  updateEdge: (edgeId: string, payload: LinkPayload) => void;
  deleteElement: (selection: SelectedElement) => void;
  deleteSelected: () => void;
  duplicateSelectedNode: () => void;
  clearTopology: () => void;
  runAutoLayout: () => void;
  undo: () => void;
  redo: () => void;
  selectElement: (selection: SelectedElement | null) => void;
  selectMany: (nodeIds: string[], edgeIds: string[]) => void;
  syncProjectScenario: () => void;
  syncEditorLayoutOnly: () => void;
}

const HISTORY_LIMIT = 50;

export const useTopologyEditorStore = create<TopologyEditorStoreState>((set, get) => ({
  nodes: [],
  edges: [],
  selected: null,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  primarySelection: null,
  past: [],
  future: [],
  dragStartSnapshot: null,
  warnings: [],

  loadScenario: (scenario) => {
    const state = projectToEditorState(scenario);
    const scenarioNodes = Array.isArray(scenario?.nodes) ? scenario.nodes : [];
    const hasScenarioCoordinates = scenarioNodes.some(
      (node) => typeof node.position_x === "number" && typeof node.position_y === "number"
    );
    const laidOut = hasScenarioCoordinates ? state.nodes : autoLayout(state.nodes, state.edges);
    set({
      nodes: laidOut,
      edges: state.edges,
      selected: null,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      primarySelection: null,
      past: [],
      future: [],
      dragStartSnapshot: null,
      warnings: topologyWarnings(scenario)
    });
  },

  onNodesChange: (changes) => {
    const removeIds = changes.filter((change) => change.type === "remove").map((change) => change.id);
    if (removeIds.length > 0) {
      pushHistory();
      const remainingNodes = get().nodes.filter((node) => !removeIds.includes(node.id));
      const remainingEdges = get().edges.filter((edge) => !removeIds.includes(edge.source) && !removeIds.includes(edge.target));
      set({
        nodes: remainingNodes,
        edges: remainingEdges,
        selected: null,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        primarySelection: null,
        future: []
      });
      get().syncProjectScenario();
      return;
    }
    set({ nodes: applyNodeChanges(changes, get().nodes) as TopologyFlowNode[] });
  },

  onEdgesChange: (changes) => {
    const removeIds = changes.filter((change) => change.type === "remove").map((change) => change.id);
    if (removeIds.length > 0) {
      pushHistory();
      set({
        edges: get().edges.filter((edge) => !removeIds.includes(edge.id)),
        selected: null,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        primarySelection: null,
        future: []
      });
      get().syncProjectScenario();
    }
  },

  addNode: (type, role, position = { x: 100, y: 100 }) => {
    pushHistory();
    const id = nextNodeId(type);
    const payload: NodePayload = {
      id,
      type,
      role,
      name: id,
      active: true,
      availability: 1,
      node_processing_delay_ms: 0,
      position_x: position.x,
      position_y: position.y
    };
    const node: TopologyFlowNode = { id, type: "lunarNode", position, data: { payload, label: id } };
    setSingleSelection({ kind: "node", id }, { nodes: [...get().nodes, node], future: [] });
    get().syncProjectScenario();
  },

  beginNodeDrag: () => {
    set({ dragStartSnapshot: snapshot(get()) });
  },

  finishNodeDrag: (nodeId, position) => {
    const before = get().dragStartSnapshot;
    const nextNodes = get().nodes.map((node) => (node.id === nodeId ? { ...node, position } : node));
    set({
      nodes: nextNodes,
      past: before ? [...get().past, before].slice(-HISTORY_LIMIT) : get().past,
      dragStartSnapshot: null,
      future: []
    });
    get().syncProjectScenario();
  },

  addLink: (payload) => {
    const nodeIds = new Set(get().nodes.map((node) => node.id));
    if (
      !nodeIds.has(payload.source) ||
      !nodeIds.has(payload.target) ||
      payload.source === payload.target ||
      isDuplicateLink(get().edges, payload.source, payload.target) ||
      !isValidLink(payload)
    ) {
      return false;
    }
    pushHistory();
    const id = payload.id || `link__${payload.source}__${payload.target}`;
    const edgePayload = { ...payload, id };
    const edges = addEdge(
      {
        id,
        source: payload.source,
        target: payload.target,
        type: "default",
        label: edgeLabel(edgePayload),
        style: edgePayload.active === false ? { strokeDasharray: "6 5", stroke: "#9aa5ad" } : undefined,
        data: { payload: edgePayload, label: edgeLabel(edgePayload) }
      },
      get().edges
    ) as TopologyFlowEdge[];
    setSingleSelection({ kind: "edge", id }, { edges, future: [] });
    get().syncProjectScenario();
    return true;
  },

  updateNode: (nodeId, payload) => {
    if (!isValidNode(payload)) return;
    pushHistory();
    set({ nodes: updateNodePayload(get().nodes, nodeId, payload), future: [] });
    get().syncProjectScenario();
  },

  updateEdge: (edgeId, payload) => {
    if (!isValidLink(payload)) return;
    pushHistory();
    set({ edges: updateEdgePayload(get().edges, edgeId, payload).map(applyEdgeVisualState), future: [] });
    get().syncProjectScenario();
  },

  deleteElement: (selection) => {
    pushHistory();
    if (selection.kind === "node") {
      setClearedSelection({
        nodes: get().nodes.filter((node) => node.id !== selection.id),
        edges: removeLinksForNode(get().edges, selection.id),
        future: []
      });
    } else {
      setClearedSelection({ edges: get().edges.filter((edge) => edge.id !== selection.id), future: [] });
    }
    get().syncProjectScenario();
  },

  deleteSelected: () => {
    const nodeIds = get().selectedNodeIds;
    const edgeIds = get().selectedEdgeIds;
    if (nodeIds.length + edgeIds.length > 1) {
      pushHistory();
      setClearedSelection({
        nodes: get().nodes.filter((node) => !nodeIds.includes(node.id)),
        edges: get().edges.filter(
          (edge) => !edgeIds.includes(edge.id) && !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
        ),
        future: []
      });
      get().syncProjectScenario();
      return;
    }
    const selected = get().selected;
    if (selected) get().deleteElement(selected);
  },

  duplicateSelectedNode: () => {
    const selected = get().primarySelection;
    if (selected?.kind !== "node") return;
    const source = get().nodes.find((node) => node.id === selected.id);
    if (!source) return;
    pushHistory();
    const id = nextNodeId(source.data.payload.type);
    const payload: NodePayload = {
      ...source.data.payload,
      id,
      name: `${source.data.payload.name || source.id}_copy`,
      position_x: source.position.x + 36,
      position_y: source.position.y + 36
    };
    const node: TopologyFlowNode = {
      id,
      type: "lunarNode",
      position: { x: source.position.x + 36, y: source.position.y + 36 },
      data: { payload, label: payload.name || id }
    };
    setSingleSelection({ kind: "node", id }, { nodes: [...get().nodes, node], future: [] });
    get().syncProjectScenario();
  },

  clearTopology: () => {
    pushHistory();
    setClearedSelection({ nodes: [], edges: [], future: [] });
    get().syncProjectScenario();
  },

  runAutoLayout: () => {
    pushHistory();
    set({ nodes: autoLayout(get().nodes, get().edges), future: [] });
    get().syncProjectScenario();
  },

  undo: () => {
    const previous = get().past.at(-1);
    if (!previous) return;
    const current = snapshot(get());
    setClearedSelection({
      nodes: previous.nodes,
      edges: previous.edges,
      past: get().past.slice(0, -1),
      future: [current, ...get().future]
    });
    get().syncProjectScenario();
  },

  redo: () => {
    const next = get().future[0];
    if (!next) return;
    const current = snapshot(get());
    setClearedSelection({
      nodes: next.nodes,
      edges: next.edges,
      past: [...get().past, current].slice(-HISTORY_LIMIT),
      future: get().future.slice(1)
    });
    get().syncProjectScenario();
  },

  selectElement: (selection) => {
    if (!selection) {
      setClearedSelection({});
      return;
    }
    setSingleSelection(selection, {});
  },

  selectMany: (nodeIds, edgeIds) => {
    const state = get();
    if (sameIds(state.selectedNodeIds, nodeIds) && sameIds(state.selectedEdgeIds, edgeIds)) return;
    const primarySelection =
      nodeIds[0] ? { kind: "node" as const, id: nodeIds[0] } : edgeIds[0] ? { kind: "edge" as const, id: edgeIds[0] } : null;
    set({
      selectedNodeIds: nodeIds,
      selectedEdgeIds: edgeIds,
      selected: nodeIds.length + edgeIds.length === 1 ? primarySelection : null,
      primarySelection
    });
  },

  syncProjectScenario: () => {
    const projectStore = useProjectStore.getState();
    const scenario = projectStore.getCurrentScenario();
    if (!scenario) return;
    const editorState = snapshot(get());
    const nextScenario = editorStateToScenario(scenario, editorState);
    projectStore.updateDraftScenario((base) => editorStateToScenario(base, editorState));
    if (hasSimulationInputChanged(scenario, nextScenario)) {
      useServiceRoutingStore.getState().markResultsStale();
    }
  },

  syncEditorLayoutOnly: () => {
    const projectStore = useProjectStore.getState();
    const scenario = projectStore.getCurrentScenario();
    if (!scenario) return;
    const editorState = snapshot(get());
    projectStore.updateDraftScenario((base) => editorStateToScenario(base, editorState));
  }
}));

export function edgeLabel(payload: LinkPayload): string {
  return `${payload.bandwidth_mbps} Mbps | ${payload.delay_ms} ms | A=${payload.availability}`;
}

function pushHistory(): void {
  const state = useTopologyEditorStore.getState();
  useTopologyEditorStore.setState({
    past: [...state.past, snapshot(state)].slice(-HISTORY_LIMIT)
  });
}

function setSingleSelection(selection: SelectedElement, patch: Partial<TopologyEditorStoreState>): void {
  useTopologyEditorStore.setState({
    ...patch,
    selected: selection,
    selectedNodeIds: selection.kind === "node" ? [selection.id] : [],
    selectedEdgeIds: selection.kind === "edge" ? [selection.id] : [],
    primarySelection: selection
  });
}

function setClearedSelection(patch: Partial<TopologyEditorStoreState>): void {
  useTopologyEditorStore.setState({
    ...patch,
    selected: null,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    primarySelection: null
  });
}

function snapshot(state: Pick<TopologyEditorStoreState, "nodes" | "edges">): TopologyEditorState {
  return {
    nodes: structuredClone(state.nodes),
    edges: structuredClone(state.edges)
  };
}

function nextNodeId(type: string): string {
  const projectStore = useProjectStore.getState();
  const draft = projectStore.draftProject;
  const current = draft?.editor.nodeTypeCounters?.[type] ?? 0;
  const next = current + 1;
  projectStore.updateDraftEditor((editor) => ({
    ...editor,
    nodeTypeCounters: { ...(editor.nodeTypeCounters ?? {}), [type]: next }
  }));
  return `${type}_${next}`;
}

function isValidNode(payload: NodePayload): boolean {
  return (
    Boolean(payload.id.trim() && payload.type.trim() && payload.role.trim()) &&
    (payload.availability ?? 1) >= 0 &&
    (payload.availability ?? 1) <= 1 &&
    (payload.node_processing_delay_ms ?? 0) >= 0
  );
}

function isValidLink(payload: LinkPayload): boolean {
  return (
    payload.bandwidth_mbps > 0 &&
    payload.delay_ms >= 0 &&
    payload.packet_loss_rate >= 0 &&
    payload.packet_loss_rate <= 1 &&
    payload.availability >= 0 &&
    payload.availability <= 1
  );
}

function applyEdgeVisualState(edge: TopologyFlowEdge): TopologyFlowEdge {
  const payload = getEdgePayload(edge);
  if (!payload) return edge;
  return {
    ...edge,
    label: edgeLabel(payload),
    data: { payload, label: edgeLabel(payload) },
    style: payload.active === false ? { strokeDasharray: "6 5", stroke: "#9aa5ad" } : undefined
  };
}

function hasSimulationInputChanged(previous: ScenarioPayload, next: ScenarioPayload): boolean {
  return JSON.stringify(simulationSignature(previous)) !== JSON.stringify(simulationSignature(next));
}

function simulationSignature(scenario: ScenarioPayload) {
  return {
    nodes: scenario.nodes.map(withoutNodePosition),
    links: scenario.links,
    services: scenario.services,
    faults: scenario.faults,
    healing: scenario.healing,
    environment: scenario.environment,
    model_parameters: scenario.model_parameters,
    physical_model_config: scenario.physical_model_config,
    fault_propagation: scenario.fault_propagation,
    technical_indicators: scenario.technical_indicators
  };
}

function withoutNodePosition(node: ScenarioPayload["nodes"][number]) {
  return Object.fromEntries(Object.entries(node).filter(([key]) => key !== "position_x" && key !== "position_y"));
}

function sameIds(current: string[], next: string[]): boolean {
  return current.length === next.length && current.every((id, index) => id === next[index]);
}
