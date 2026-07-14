import { useEffect } from "react";
import { Card, Empty, Form, Input, InputNumber, Select, Switch, Typography } from "antd";
import { useTopologyEditorStore } from "../../stores/topologyEditorStore";
import { getEdgePayload } from "../../utils/topologyTransforms";
import {
  type LinkFormValues,
  type NodeFormValues,
  linkFormValuesToPayload,
  linkPayloadToFormValues,
  nodeFormValuesToPayload,
  nodePayloadToFormValues
} from "./formModels";
import { linkTypeOptions, nodeTypeOptions } from "./topologyOptions";

export function PropertyPanel() {
  const selected = useTopologyEditorStore((state) => state.selected);
  const selectedNodeIds = useTopologyEditorStore((state) => state.selectedNodeIds);
  const selectedEdgeIds = useTopologyEditorStore((state) => state.selectedEdgeIds);
  const nodes = useTopologyEditorStore((state) => state.nodes);
  const edges = useTopologyEditorStore((state) => state.edges);
  const updateNode = useTopologyEditorStore((state) => state.updateNode);
  const updateEdge = useTopologyEditorStore((state) => state.updateEdge);
  const [nodeForm] = Form.useForm<NodeFormValues>();
  const [edgeForm] = Form.useForm<LinkFormValues>();

  const selectedNode = selected?.kind === "node" ? nodes.find((node) => node.id === selected.id) : null;
  const selectedEdge = selected?.kind === "edge" ? edges.find((edge) => edge.id === selected.id) : null;
  const selectedEdgePayload = selectedEdge ? getEdgePayload(selectedEdge) : null;
  const selectedCount = selectedNodeIds.length + selectedEdgeIds.length;

  useEffect(() => {
    if (selectedNode) {
      nodeForm.setFieldsValue(nodePayloadToFormValues(selectedNode.data.payload));
    }
  }, [nodeForm, selectedNode]);

  useEffect(() => {
    if (selectedEdgePayload) {
      edgeForm.setFieldsValue(linkPayloadToFormValues(selectedEdgePayload));
    }
  }, [edgeForm, selectedEdgePayload]);

  if (selectedCount > 1) {
    return (
      <Card title="批量选择" size="small" className="property-panel">
        <Typography.Paragraph>已选择 {selectedNodeIds.length} 个节点、{selectedEdgeIds.length} 条链路。</Typography.Paragraph>
        <Typography.Text type="secondary">本轮支持批量删除；批量属性修改将在后续轮次开放。</Typography.Text>
      </Card>
    );
  }

  if (!selected) {
    return (
      <Card title="属性面板" size="small" className="property-panel">
        <Empty description="请选择节点或链路" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </Card>
    );
  }

  if (selectedNode) {
    const commitNode = () => {
      void nodeForm
        .validateFields()
        .then((values) => {
          updateNode(selectedNode.id, nodeFormValuesToPayload(selectedNode.data.payload, values));
        })
        .catch(() => undefined);
    };
    return (
      <Card title="节点属性" size="small" className="property-panel">
        <Form form={nodeForm} layout="vertical" onBlur={commitNode} onFinish={commitNode}>
          <Form.Item name="id" label="节点 ID">
            <Input disabled />
          </Form.Item>
          <Form.Item name="name" label="节点名称">
            <Input onPressEnter={commitNode} />
          </Form.Item>
          <Form.Item name="type" label="节点类型" rules={[{ required: true, message: "请选择节点类型" }]}>
            <Select options={nodeTypeOptions} />
          </Form.Item>
          <Form.Item name="role" label="节点角色" rules={[{ required: true, message: "请输入节点角色" }]}>
            <Input onPressEnter={commitNode} />
          </Form.Item>
          <Form.Item name="active" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="availability" label="节点可用率" rules={[{ type: "number", min: 0, max: 1, message: "可用率必须在 0 到 1 之间" }]}>
            <InputNumber className="full-width" min={0} max={1} step={0.0001} />
          </Form.Item>
          <Form.Item
            name="node_processing_delay_ms"
            label="节点处理时延 ms"
            rules={[{ type: "number", min: 0, message: "处理时延必须大于等于 0" }]}
          >
            <InputNumber className="full-width" min={0} />
          </Form.Item>
          <Form.Item name="position_x" label="X 坐标">
            <InputNumber className="full-width" />
          </Form.Item>
          <Form.Item name="position_y" label="Y 坐标">
            <InputNumber className="full-width" />
          </Form.Item>
        </Form>
      </Card>
    );
  }

  if (selectedEdge && selectedEdgePayload) {
    const commitEdge = () => {
      void edgeForm
        .validateFields()
        .then((values) => {
          updateEdge(selectedEdge.id, linkFormValuesToPayload(selectedEdgePayload, values));
        })
        .catch(() => undefined);
    };
    return (
      <Card title="链路属性" size="small" className="property-panel">
        <Form form={edgeForm} layout="vertical" onBlur={commitEdge} onFinish={commitEdge}>
          <Form.Item name="id" label="链路 ID">
            <Input disabled />
          </Form.Item>
          <Form.Item name="name" label="链路名称">
            <Input onPressEnter={commitEdge} />
          </Form.Item>
          <Form.Item name="source" label="源节点">
            <Input disabled />
          </Form.Item>
          <Form.Item name="target" label="目标节点">
            <Input disabled />
          </Form.Item>
          <Form.Item name="kind" label="链路类型" rules={[{ required: true, message: "请选择链路类型" }]}>
            <Select options={linkTypeOptions} />
          </Form.Item>
          <Form.Item name="bandwidth_mbps" label="带宽 Mbps" rules={[{ type: "number", min: 0.000001, message: "带宽必须大于 0" }]}>
            <InputNumber className="full-width" min={0.000001} />
          </Form.Item>
          <Form.Item name="delay_ms" label="时延 ms" rules={[{ type: "number", min: 0, message: "时延必须大于等于 0" }]}>
            <InputNumber className="full-width" min={0} />
          </Form.Item>
          <Form.Item name="packet_loss_rate" label="丢包率" rules={[{ type: "number", min: 0, max: 1, message: "丢包率必须在 0 到 1 之间" }]}>
            <InputNumber className="full-width" min={0} max={1} step={0.000001} />
          </Form.Item>
          <Form.Item name="availability" label="可用率" rules={[{ type: "number", min: 0, max: 1, message: "可用率必须在 0 到 1 之间" }]}>
            <InputNumber className="full-width" min={0} max={1} step={0.0001} />
          </Form.Item>
          <Form.Item name="active" label="启用状态" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Card>
    );
  }

  return (
    <Card title="属性面板" size="small" className="property-panel">
      <Empty description="选中的链路缺少属性数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </Card>
  );
}
