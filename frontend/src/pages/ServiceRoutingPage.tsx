import { useEffect, useMemo } from "react";
import {
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  SyncOutlined
} from "@ant-design/icons";
import { App, Button, Card, Descriptions, Empty, Form, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useHealthQuery } from "../api/health";
import type { NodePayload, RouteSnapshotItemResponse, ServicePayload } from "../api/contracts";
import { evaluateQosPrecheck, formatNumber, formatScientific, type QosPrecheckResult } from "../features/routing/qosPrecheck";
import { applyRouteHighlight } from "../features/routing/pathHighlight";
import { servicePresets, serviceTypeLabel } from "../features/services/servicePresets";
import { lunarNodeTypes } from "../features/topology/nodeTypes";
import { useProjectStore } from "../stores/projectStore";
import { useServiceRoutingStore, type RouteStatus } from "../stores/serviceRoutingStore";
import { projectToEditorState } from "../utils/topologyTransforms";

interface ServiceFormValues {
  name?: string;
  service_type?: string;
  source: string;
  target: string;
  priority: number;
  required_bandwidth_mbps: number;
  max_delay_ms?: number | null;
  max_loss_rate?: number | null;
  min_success_rate?: number | null;
  max_interruption_s?: number | null;
  degraded_bandwidth_mbps?: number | null;
}

export function ServiceRoutingPage() {
  const draftProject = useProjectStore((state) => state.draftProject);
  const ensureProjectContext = useServiceRoutingStore((state) => state.ensureProjectContext);
  const projectId = draftProject?.projectId ?? null;
  const serviceIds = useMemo(() => draftProject?.scenario.services.map((service) => service.id) ?? [], [draftProject]);

  useEffect(() => {
    ensureProjectContext(projectId, serviceIds);
  }, [ensureProjectContext, projectId, serviceIds]);

  if (!draftProject) {
    return (
      <div className="empty-editor">
        <Empty description="请先新建或打开项目" />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <ServiceRoutingContent />
    </ReactFlowProvider>
  );
}

function ServiceRoutingContent() {
  const { message } = App.useApp();
  const draftProject = useProjectStore((state) => state.draftProject);
  const saveCurrent = useProjectStore((state) => state.saveCurrent);
  const backendTopologyStatus = useServiceRoutingStore((state) => state.backendTopologyStatus);
  const routeStatus = useServiceRoutingStore((state) => state.routeStatus);
  const sessionId = useServiceRoutingStore((state) => state.sessionId);
  const topologySnapshot = useServiceRoutingStore((state) => state.topologySnapshot);
  const routes = useServiceRoutingStore((state) => state.routes);
  const selectedServiceId = useServiceRoutingStore((state) => state.selectedServiceId);
  const error = useServiceRoutingStore((state) => state.error);
  const lastInvalidationReason = useServiceRoutingStore((state) => state.lastInvalidationReason);
  const addService = useServiceRoutingStore((state) => state.addService);
  const updateService = useServiceRoutingStore((state) => state.updateService);
  const duplicateService = useServiceRoutingStore((state) => state.duplicateService);
  const deleteService = useServiceRoutingStore((state) => state.deleteService);
  const selectService = useServiceRoutingStore((state) => state.selectService);
  const buildBackendTopology = useServiceRoutingStore((state) => state.buildBackendTopology);
  const calculateRoutes = useServiceRoutingStore((state) => state.calculateRoutes);
  const { isError: backendOffline } = useHealthQuery();
  const [form] = Form.useForm<ServiceFormValues>();

  const scenario = draftProject?.scenario;
  const services = useMemo(() => scenario?.services ?? [], [scenario]);
  const nodes = useMemo(() => scenario?.nodes ?? [], [scenario]);
  const selectedService = services.find((service) => service.id === selectedServiceId) ?? services[0] ?? null;
  const currentRoute = routeStatus === "已计算" && selectedService ? routes[selectedService.id] : undefined;
  const currentQos = selectedService && currentRoute ? evaluateQosPrecheck(selectedService, currentRoute) : null;

  useEffect(() => {
    if (!selectedServiceId && services[0]) {
      selectService(services[0].id);
    } else if (selectedServiceId && !services.some((service) => service.id === selectedServiceId)) {
      selectService(services[0]?.id ?? null);
    }
  }, [selectService, selectedServiceId, services]);

  useEffect(() => {
    if (selectedService) {
      form.setFieldsValue(serviceToForm(selectedService));
    }
  }, [form, selectedService]);

  const nodeOptions = useMemo(
    () =>
      nodes.map((node) => ({
        value: node.id,
        label: `${formatNodeDisplay(node.id, nodes)} / ${node.type}${node.active === false ? " / 停用" : ""}`
      })),
    [nodes]
  );

  const flow = useMemo(() => {
    if (!scenario) return { nodes: [], edges: [] };
    const base = projectToEditorState(scenario);
    return applyRouteHighlight(base.nodes, base.edges, currentRoute ?? null);
  }, [scenario, currentRoute]);

  const columns: ColumnsType<ServicePayload> = [
    { title: "业务名称", dataIndex: "name", key: "name", render: (value, row) => value || row.id },
    { title: "业务 ID", dataIndex: "id", key: "id", ellipsis: true },
    { title: "业务类型", dataIndex: "service_type", key: "service_type", render: serviceTypeLabel },
    { title: "源节点", dataIndex: "source", key: "source", render: (value) => formatNodeDisplay(String(value), nodes) },
    { title: "目标节点", dataIndex: "target", key: "target", render: (value) => formatNodeDisplay(String(value), nodes) },
    { title: "优先级", dataIndex: "priority", key: "priority", width: 80 },
    { title: "需求带宽", dataIndex: "required_bandwidth_mbps", key: "bandwidth", render: (value) => `${value} Mbps` },
    {
      title: "路径状态",
      key: "route",
      render: (_, service) => <RouteStatusTag service={service} route={routeStatus === "已计算" ? routes[service.id] : undefined} routeStatus={routeStatus} />
    }
  ];

  const routeSummary = summarizeRoutes(services, routes, routeStatus);
  const buildBusy = backendTopologyStatus === "构建中";
  const routeBusy = routeStatus === "计算中";

  const saveService = () => {
    if (!selectedService) return;
    void form
      .validateFields()
      .then((values) => {
        updateService(selectedService.id, formToServicePatch(values));
        message.success("业务配置已保存");
      })
      .catch(() => undefined);
  };

  const runBuild = () => {
    if (backendOffline) {
      message.error("后端未连接，无法执行路径计算");
      return;
    }
    void buildBackendTopology();
  };

  const runRoutes = () => {
    if (backendOffline) {
      message.error("后端未连接，无法执行路径计算");
      return;
    }
    void calculateRoutes();
  };

  return (
    <div className="service-routing-page">
      <div className="routing-stepbar">
        <Space wrap>
          <Button type="primary" icon={<SyncOutlined />} disabled={buildBusy || routeBusy} loading={buildBusy} onClick={runBuild}>
            ① 构建拓扑
          </Button>
          <Button
            type="primary"
            ghost
            disabled={backendTopologyStatus !== "已构建" || buildBusy || routeBusy}
            loading={routeBusy}
            onClick={runRoutes}
          >
            ② 计算路径
          </Button>
          <Tag color={statusColor(backendTopologyStatus)}>拓扑：{backendTopologyStatus}</Tag>
          <Tag color={statusColor(routeStatus)}>路径：{routeStatus}</Tag>
          <Tag>算法：最小时延路径 / shortest_delay</Tag>
          {sessionId ? <Tag>Session {sessionId.slice(0, 8)}</Tag> : null}
          {error ? <Tag color="error">{error}</Tag> : null}
        </Space>
        <Typography.Text type="secondary">
          以链路 delay_ms 为权重，使用当前活动拓扑计算最短路径。本轮仅开放前两步。
        </Typography.Text>
      </div>
      <aside className="service-list-panel">
        <Card
          title="业务列表"
          size="small"
          extra={
            <Space>
              <Select
                className="service-preset-select"
                defaultValue="custom"
                options={servicePresets.map((preset) => ({ value: preset.id, label: preset.label }))}
                onChange={(presetId) => {
                  const service = addService(presetId);
                  message.success(`已新增业务 ${service.name || service.id}`);
                }}
              />
              <Button icon={<PlusOutlined />} onClick={() => addService("custom")} />
            </Space>
          }
        >
          <Space wrap className="routing-summary">
            <Tag>总数 {routeSummary.total}</Tag>
            <Tag color="success">有效 {routeSummary.valid}</Tag>
            <Tag color="error">无路径 {routeSummary.invalid}</Tag>
            <Tag color="success">QoS 通过 {routeSummary.qosPassed}</Tag>
            <Tag color="warning">QoS 未通过 {routeSummary.qosFailed}</Tag>
            <Tag color="processing">QoS 无法判定 {routeSummary.qosUnknown}</Tag>
          </Space>
          <Table
            size="small"
            rowKey="id"
            columns={columns}
            dataSource={services}
            pagination={false}
            rowSelection={{
              type: "radio",
              selectedRowKeys: selectedService ? [selectedService.id] : [],
              onChange: ([key]) => selectService(String(key))
            }}
            onRow={(record) => ({ onClick: () => selectService(record.id) })}
          />
        </Card>
      </aside>
      <section className="routing-flow-panel">
        <ReactFlow nodes={flow.nodes} edges={flow.edges} nodeTypes={lunarNodeTypes} nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} fitView>
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </section>
      <aside className="route-detail-panel">
        <Card title="业务/路径详情" size="small">
          {!selectedService ? (
            <Empty description="请选择业务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Space direction="vertical" className="full-width" size={12}>
              <Form form={form} layout="vertical" onFinish={saveService}>
                <Form.Item label="业务 ID">
                  <Input value={selectedService.id} disabled />
                </Form.Item>
                <Form.Item name="name" label="业务名称">
                  <Input />
                </Form.Item>
                <Form.Item name="service_type" label="业务类型">
                  <Select
                    options={servicePresets.map((preset) => ({
                      value: preset.id,
                      label: `${preset.label}（${preset.description}）`
                    }))}
                  />
                </Form.Item>
                <Form.Item name="source" label="源节点" rules={[{ required: true, message: "请选择源节点" }]}>
                  <Select options={nodeOptions} />
                </Form.Item>
                <Form.Item
                  name="target"
                  label="目标节点"
                  dependencies={["source"]}
                  rules={[
                    { required: true, message: "请选择目标节点" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        return value && value === getFieldValue("source")
                          ? Promise.reject(new Error("源节点和目标节点不能相同"))
                          : Promise.resolve();
                      }
                    })
                  ]}
                >
                  <Select options={nodeOptions} />
                </Form.Item>
                <Form.Item name="priority" label="优先级" rules={[{ type: "number", min: 0, message: "优先级必须大于等于 0" }]}>
                  <InputNumber className="full-width" min={0} precision={0} />
                </Form.Item>
                <Form.Item name="required_bandwidth_mbps" label="需求带宽 Mbps" rules={[{ type: "number", min: 0.000001, message: "需求带宽必须大于 0" }]}>
                  <InputNumber className="full-width" min={0.000001} />
                </Form.Item>
                <Form.Item name="max_delay_ms" label="最大时延 ms" rules={[{ type: "number", min: 0, message: "最大时延不能为负数" }]}>
                  <InputNumber className="full-width" min={0} />
                </Form.Item>
                <Form.Item name="max_loss_rate" label="最大丢包率" rules={[{ type: "number", min: 0, max: 1, message: "最大丢包率必须在 0 到 1 之间" }]}>
                  <InputNumber className="full-width" min={0} max={1} step={0.000001} />
                </Form.Item>
                <Form.Item name="min_success_rate" label="最小成功率" rules={[{ type: "number", min: 0, max: 1, message: "最小成功率必须在 0 到 1 之间" }]}>
                  <InputNumber className="full-width" min={0} max={1} step={0.000001} />
                </Form.Item>
                <Form.Item name="max_interruption_s" label="最大中断时间 s" rules={[{ type: "number", min: 0, message: "最大中断时间不能为负数" }]}>
                  <InputNumber className="full-width" min={0} />
                </Form.Item>
                <Form.Item
                  name="degraded_bandwidth_mbps"
                  label="降级带宽 Mbps"
                  dependencies={["required_bandwidth_mbps"]}
                  rules={[
                    { type: "number", min: 0.000001, message: "降级带宽必须大于 0" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        const required = getFieldValue("required_bandwidth_mbps");
                        return value != null && required != null && value > required
                          ? Promise.reject(new Error("降级带宽不能大于需求带宽"))
                          : Promise.resolve();
                      }
                    })
                  ]}
                >
                  <InputNumber className="full-width" min={0.000001} />
                </Form.Item>
                <Space>
                  <Button type="primary" icon={<SaveOutlined />} onClick={saveService}>
                    保存业务
                  </Button>
                  <Button icon={<CopyOutlined />} onClick={() => selectedService && duplicateService(selectedService.id)}>
                    复制
                  </Button>
                  <Popconfirm
                    title="确认删除该业务？"
                    description="删除后需保存项目才能写入本地项目文档。"
                    okText="删除"
                    cancelText="取消"
                    onConfirm={() => selectedService && deleteService(selectedService.id)}
                  >
                    <Button danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              </Form>
              <RouteDetails
                service={selectedService}
                route={currentRoute}
                routeStatus={routeStatus}
                qos={currentQos}
                nodes={nodes}
                error={error}
                invalidationReason={lastInvalidationReason}
              />
              <TopologySnapshotSummary snapshot={topologySnapshot} />
              <Button onClick={() => void saveCurrent().then((saved) => {
                if (saved) message.success("项目已保存到数据库");
                else message.error(useProjectStore.getState().saveError ?? "项目保存失败");
              })}>保存项目</Button>
            </Space>
          )}
        </Card>
      </aside>
    </div>
  );
}

function formatNodeDisplay(nodeId: string, nodes: NodePayload[]): string {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return `${nodeId}（节点不存在）`;
  return node.name ? `${node.name}（${node.id}）` : node.id;
}

function RouteDetails({
  service,
  route,
  routeStatus,
  qos,
  nodes,
  error,
  invalidationReason
}: {
  service: ServicePayload;
  route?: RouteSnapshotItemResponse;
  routeStatus: RouteStatus;
  qos: QosPrecheckResult | null;
  nodes: NodePayload[];
  error: string | null;
  invalidationReason: string | null;
}) {
  if (routeStatus === "已过期") {
    return (
      <Card size="small" title="路径结果已过期">
        <Typography.Paragraph>当前项目的拓扑或业务配置已经变化。</Typography.Paragraph>
        <Typography.Paragraph>请重新执行：① 构建拓扑，② 计算路径。</Typography.Paragraph>
        {invalidationReason ? <Typography.Text type="secondary">过期原因：{invalidationReason}</Typography.Text> : null}
      </Card>
    );
  }
  if (routeStatus === "失败") {
    return (
      <Card size="small" title="路径计算失败">
        <Typography.Text type="danger">{error || "请检查后端状态后重试"}</Typography.Text>
      </Card>
    );
  }
  if (routeStatus === "计算中") {
    return (
      <Card size="small">
        <Typography.Text>正在计算路径...</Typography.Text>
      </Card>
    );
  }
  if (routeStatus !== "已计算") {
    return (
      <Card size="small">
        <Typography.Text type="secondary">尚未计算路径。请先执行 ① 构建拓扑，再执行 ② 计算路径。</Typography.Text>
      </Card>
    );
  }

  const nodePath = route?.path?.length
    ? route.path.map((nodeId) => formatNodeDisplay(nodeId, nodes)).join(" -> ")
    : "当前活动拓扑中无可达路径";
  return (
    <Space direction="vertical" className="full-width">
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="业务 ID">{service.id}</Descriptions.Item>
        <Descriptions.Item label="源节点">{formatNodeDisplay(service.source, nodes)}</Descriptions.Item>
        <Descriptions.Item label="目标节点">{formatNodeDisplay(service.target, nodes)}</Descriptions.Item>
        <Descriptions.Item label="路径状态">{route?.valid ? "有效" : route ? "无路径" : "尚未计算"}</Descriptions.Item>
        <Descriptions.Item label="路由来源">{route?.route_source ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="完整节点序列">{nodePath}</Descriptions.Item>
        <Descriptions.Item label="经过节点数">{route?.path?.length ?? 0}</Descriptions.Item>
        <Descriptions.Item label="经过链路数">{route?.path ? Math.max(0, route.path.length - 1) : 0}</Descriptions.Item>
        <Descriptions.Item label="瓶颈带宽">{formatNumber(route?.bottleneck_bandwidth_mbps)} Mbps</Descriptions.Item>
        <Descriptions.Item label="总时延">{formatNumber(route?.total_delay_ms)} ms</Descriptions.Item>
        <Descriptions.Item label="路径丢包率">{formatScientific(route?.packet_loss_rate)}</Descriptions.Item>
        <Descriptions.Item label="路径可用率">{formatNumber(route?.availability, 6)}</Descriptions.Item>
        <Descriptions.Item label="切换扰动">{formatNumber(route?.handover_disturbance_ms)} ms</Descriptions.Item>
        <Descriptions.Item label="后端备注">{route?.notes || "-"}</Descriptions.Item>
      </Descriptions>
      <Typography.Text type="secondary">路径级预检查只比较当前静态路径指标，不等同于第 3 步业务仿真最终结论。</Typography.Text>
      {qos ? <Tag color={qosColor(qos.overallStatus)}>{qosLabel(qos.overallStatus)}</Tag> : null}
      {qos?.items.map((item) => (
        <Tag key={item.key} color={item.status === "pass" ? "success" : item.status === "fail" ? "error" : item.status === "unknown" ? "processing" : "default"}>
          {item.label}: {item.detail}
        </Tag>
      ))}
    </Space>
  );
}

function TopologySnapshotSummary({ snapshot }: { snapshot: ReturnType<typeof useServiceRoutingStore.getState>["topologySnapshot"] }) {
  if (!snapshot) return null;
  return (
    <Descriptions size="small" column={2} bordered>
      <Descriptions.Item label="节点总数">{String(snapshot.summary.node_count ?? "-")}</Descriptions.Item>
      <Descriptions.Item label="链路总数">{String(snapshot.summary.edge_count ?? "-")}</Descriptions.Item>
      <Descriptions.Item label="活动节点">{String(snapshot.summary.active_node_count ?? "-")}</Descriptions.Item>
      <Descriptions.Item label="活动链路">{String(snapshot.summary.active_edge_count ?? "-")}</Descriptions.Item>
    </Descriptions>
  );
}

function RouteStatusTag({ service, route, routeStatus }: { service: ServicePayload; route: RouteSnapshotItemResponse | undefined; routeStatus: string }) {
  if (routeStatus === "已过期") return <Tag color="warning">结果已过期</Tag>;
  if (routeStatus === "失败") return <Tag color="error">路径计算失败</Tag>;
  if (routeStatus === "计算中") return <Tag color="processing">计算中</Tag>;
  if (!route || routeStatus !== "已计算") return <Tag>尚未计算</Tag>;
  if (!route.valid) return <Tag color="error">无路径</Tag>;
  const qos = evaluateQosPrecheck(service, route);
  if (qos.overallStatus === "pass") return <Tag color="success">QoS 预检通过</Tag>;
  if (qos.overallStatus === "fail") return <Tag color="warning">QoS 预检未通过</Tag>;
  return <Tag color="processing">QoS 无法判定</Tag>;
}

function summarizeRoutes(services: ServicePayload[], routes: Record<string, RouteSnapshotItemResponse>, routeStatus: string) {
  if (routeStatus !== "已计算") {
    return { total: services.length, valid: 0, invalid: 0, qosPassed: 0, qosFailed: 0, qosUnknown: 0 };
  }
  return services.reduce(
    (summary, service) => {
      const route = routes[service.id];
      if (!route?.valid) {
        summary.invalid += 1;
        return summary;
      }
      summary.valid += 1;
      const qos = evaluateQosPrecheck(service, route);
      if (qos.overallStatus === "pass") summary.qosPassed += 1;
      else if (qos.overallStatus === "fail") summary.qosFailed += 1;
      else summary.qosUnknown += 1;
      return summary;
    },
    { total: services.length, valid: 0, invalid: 0, qosPassed: 0, qosFailed: 0, qosUnknown: 0 }
  );
}

function serviceToForm(service: ServicePayload): ServiceFormValues {
  return {
    name: service.name ?? undefined,
    service_type: service.service_type ?? "custom",
    source: service.source,
    target: service.target,
    priority: service.priority,
    required_bandwidth_mbps: service.required_bandwidth_mbps,
    max_delay_ms: service.max_delay_ms ?? null,
    max_loss_rate: service.max_loss_rate ?? null,
    min_success_rate: service.min_success_rate ?? null,
    max_interruption_s: service.max_interruption_s ?? null,
    degraded_bandwidth_mbps: service.degraded_bandwidth_mbps ?? null
  };
}

function formToServicePatch(values: ServiceFormValues): Partial<ServicePayload> {
  return {
    ...values,
    max_delay_ms: optionalNumber(values.max_delay_ms),
    max_loss_rate: optionalNumber(values.max_loss_rate),
    min_success_rate: optionalNumber(values.min_success_rate),
    max_interruption_s: optionalNumber(values.max_interruption_s),
    degraded_bandwidth_mbps: optionalNumber(values.degraded_bandwidth_mbps)
  };
}

function optionalNumber(value: number | null | undefined): number | null {
  return value == null ? null : value;
}

function statusColor(status: string): string {
  if (status === "已构建" || status === "已计算") return "success";
  if (status === "构建中" || status === "计算中") return "processing";
  if (status === "已过期") return "warning";
  if (status === "失败") return "error";
  return "default";
}

function qosColor(status: "pass" | "fail" | "unknown"): string {
  if (status === "pass") return "success";
  if (status === "fail") return "warning";
  return "processing";
}

function qosLabel(status: "pass" | "fail" | "unknown"): string {
  if (status === "pass") return "QoS 预检通过";
  if (status === "fail") return "QoS 预检未通过";
  return "QoS 无法判定";
}
