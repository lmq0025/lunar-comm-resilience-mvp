import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClearOutlined,
  CopyOutlined,
  DeleteOutlined,
  LayoutOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
  ZoomInOutlined
} from "@ant-design/icons";
import { App, Button, Empty, Popconfirm, Space } from "antd";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type Viewport
} from "@xyflow/react";
import { useScenarioValidationMutation } from "../api/scenarios";
import { lunarNodeTypes } from "../features/topology/nodeTypes";
import { NewLinkDialog, type PendingConnection } from "../features/topology/NewLinkDialog";
import { NodePalette } from "../features/topology/NodePalette";
import { PropertyPanel } from "../features/topology/PropertyPanel";
import { ValidationPanel } from "../features/topology/ValidationPanel";
import { useProjectStore } from "../stores/projectStore";
import { useTopologyEditorStore } from "../stores/topologyEditorStore";
import { useUiStore } from "../stores/uiStore";
import type { SelectedElement } from "../types/topology";
import { isEditableEventTarget } from "../utils/keyboard";

export function TopologyEditorPage() {
  const draftProject = useProjectStore((state) => state.draftProject);
  const setActiveMenu = useUiStore((state) => state.setActiveMenu);
  const loadScenario = useTopologyEditorStore((state) => state.loadScenario);
  const loadedProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (draftProject && loadedProjectId.current !== draftProject.projectId) {
      loadScenario(draftProject.scenario);
      loadedProjectId.current = draftProject.projectId;
    }
  }, [draftProject, loadScenario]);

  if (!draftProject) {
    return (
      <div className="empty-editor">
        <Empty description="请先新建或打开项目">
          <Button type="primary" onClick={() => setActiveMenu("projects")}>
            打开项目管理
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <TopologyEditorCanvas />
    </ReactFlowProvider>
  );
}

function TopologyEditorCanvas() {
  const { message } = App.useApp();
  const nodes = useTopologyEditorStore((state) => state.nodes);
  const edges = useTopologyEditorStore((state) => state.edges);
  const selected = useTopologyEditorStore((state) => state.selected);
  const selectedNodeIds = useTopologyEditorStore((state) => state.selectedNodeIds);
  const selectedEdgeIds = useTopologyEditorStore((state) => state.selectedEdgeIds);
  const onNodesChange = useTopologyEditorStore((state) => state.onNodesChange);
  const onEdgesChange = useTopologyEditorStore((state) => state.onEdgesChange);
  const addNode = useTopologyEditorStore((state) => state.addNode);
  const addLink = useTopologyEditorStore((state) => state.addLink);
  const beginNodeDrag = useTopologyEditorStore((state) => state.beginNodeDrag);
  const finishNodeDrag = useTopologyEditorStore((state) => state.finishNodeDrag);
  const deleteSelected = useTopologyEditorStore((state) => state.deleteSelected);
  const duplicateSelectedNode = useTopologyEditorStore((state) => state.duplicateSelectedNode);
  const undo = useTopologyEditorStore((state) => state.undo);
  const redo = useTopologyEditorStore((state) => state.redo);
  const runAutoLayout = useTopologyEditorStore((state) => state.runAutoLayout);
  const clearTopology = useTopologyEditorStore((state) => state.clearTopology);
  const selectElement = useTopologyEditorStore((state) => state.selectElement);
  const selectMany = useTopologyEditorStore((state) => state.selectMany);
  const saveCurrent = useProjectStore((state) => state.saveCurrent);
  const draftProject = useProjectStore((state) => state.draftProject);
  const getCurrentScenario = useProjectStore((state) => state.getCurrentScenario);
  const setValidation = useProjectStore((state) => state.setValidation);
  const updateViewport = useProjectStore((state) => state.updateViewport);
  const validationMutation = useScenarioValidationMutation();
  const reactFlow = useReactFlow();
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  const visibleNodes = useMemo(
    () => nodes.map((node) => ({ ...node, selected: selectedNodeIds.includes(node.id) || (selected?.kind === "node" && selected.id === node.id) })),
    [nodes, selected, selectedNodeIds]
  );
  const visibleEdges = useMemo(
    () => edges.map((edge) => ({ ...edge, selected: selectedEdgeIds.includes(edge.id) || (selected?.kind === "edge" && selected.id === edge.id) })),
    [edges, selected, selectedEdgeIds]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (isEditableEventTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undo();
      }
      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redo();
      }
      if ((event.ctrlKey || event.metaKey) && key === "d") {
        event.preventDefault();
        duplicateSelectedNode();
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, duplicateSelectedNode, redo, undo]);

  const validateCurrentScenario = () => {
    const scenario = getCurrentScenario();
    if (!scenario) return;
    setValidation("验证中", null);
    validationMutation.mutate(scenario, {
      onSuccess: (result) => {
        setValidation(result.valid ? "验证通过" : "验证失败", result);
        message[result.valid ? "success" : "error"](result.valid ? "场景验证通过" : "场景验证失败");
      },
      onError: (error) => {
        setValidation("验证失败", null);
        message.error(error instanceof Error ? error.message : "场景验证失败");
      }
    });
  };

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    setPendingConnection({ source: connection.source, target: connection.target });
  };

  const onNodeClick: NodeMouseHandler = (_, node) => selectElement({ kind: "node", id: node.id });
  const onEdgeClick: EdgeMouseHandler = (_, edge) => selectElement({ kind: "edge", id: edge.id });
  const initialViewport = draftProject?.editor.viewport;
  const locateElement = (selection: SelectedElement) => {
    const node = nodes.find((item) => item.id === selection.id);
    if (node) {
      reactFlow.setCenter(node.position.x, node.position.y, { zoom: 1.2, duration: 300 });
    } else {
      reactFlow.fitView({ nodes: [{ id: selection.id }], padding: 0.3, duration: 300 });
    }
  };

  return (
    <div className="topology-page">
      <aside className="left-tools">
        <NodePalette />
        <ValidationPanel validating={validationMutation.isPending} onValidate={validateCurrentScenario} onLocate={locateElement} />
      </aside>
      <section className="canvas-section">
        <div className="canvas-toolbar">
          <Space wrap>
            <Button icon={<UndoOutlined />} onClick={undo} />
            <Button icon={<RedoOutlined />} onClick={redo} />
            <Button icon={<CopyOutlined />} onClick={duplicateSelectedNode} />
            <Button icon={<DeleteOutlined />} onClick={deleteSelected} />
            <Button icon={<LayoutOutlined />} onClick={runAutoLayout}>
              自动布局
            </Button>
            <Button
              icon={<ZoomInOutlined />}
              onClick={() => {
                reactFlow.fitView({ padding: 0.2 });
                updateViewport(reactFlow.getViewport());
              }}
            >
              适应视图
            </Button>
            <Popconfirm title="确认清空拓扑？" onConfirm={clearTopology} okText="清空" cancelText="取消">
              <Button danger icon={<ClearOutlined />}>
                清空拓扑
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => {
                saveCurrent();
                message.success("项目已保存");
              }}
            >
              保存
            </Button>
            <Button onClick={validateCurrentScenario}>验证场景</Button>
          </Space>
        </div>
        <div
          className="flow-wrapper"
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(event) => {
            event.preventDefault();
            const type = event.dataTransfer.getData("application/lunar-node-type");
            if (!type) return;
            const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
            addNode(type, `${type}_role`, position);
          }}
        >
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={lunarNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) =>
              selectMany(selectedNodes.map((node) => node.id), selectedEdges.map((edge) => edge.id))
            }
            onPaneClick={() => selectElement(null)}
            onNodeDragStart={beginNodeDrag}
            onNodeDragStop={(_, node) => finishNodeDrag(node.id, node.position)}
            onMoveEnd={(_, viewport: Viewport) => updateViewport(viewport)}
            defaultViewport={initialViewport}
            fitView={!initialViewport}
            selectionOnDrag
            multiSelectionKeyCode={["Control", "Shift", "Meta"]}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      </section>
      <aside className="right-panel">
        <PropertyPanel />
      </aside>
      <NewLinkDialog
        open={Boolean(pendingConnection)}
        connection={pendingConnection}
        onCancel={() => setPendingConnection(null)}
        onCreate={(payload) => {
          if (!addLink(payload)) {
            message.warning("链路参数无效，或存在自环/重复链路");
          }
          setPendingConnection(null);
        }}
      />
    </div>
  );
}
