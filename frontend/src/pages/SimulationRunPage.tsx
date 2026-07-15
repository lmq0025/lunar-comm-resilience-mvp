import { useEffect, useMemo } from "react";
import { App, Alert, Button, Card, Descriptions, Empty, InputNumber, Popconfirm, Select, Slider, Space, Switch, Table, Tabs, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { DefaultOptionType } from "antd/es/select";
import { PlayCircleOutlined, PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { useCatalogsQuery } from "../api/catalogs";
import { downloadArtifact, downloadArtifactBundle } from "../api/routing";
import type {
  ArtifactItemResponse,
  CatalogItemResponse,
  FaultPayload,
  FaultRecordResponse,
  FaultImpactSummaryResponse,
  GraphSnapshotResponse,
  HealingActionResponse,
  IndicatorCheckResponse,
  LinkPayload,
  MetricDeltaResponse,
  MetricRowResponse,
  NodePayload,
  PhysicalModelMetricsResponse,
  PhysicalModelValidationItemResponse,
  RouteSnapshotItemResponse,
  ServicePayload,
  ServiceSimulationResultResponse
} from "../api/contracts";
import { faultCatalogItems, faultCatalogMap } from "../features/simulation/faultCatalog";
import { formatSimulationNumber, finiteNumber } from "../features/simulation/formatters";
import { StageTopologyGraph } from "../features/simulation/StageTopologyGraph";
import { useProjectStore } from "../stores/projectStore";
import { useServiceRoutingStore, type SelectedStage } from "../stores/serviceRoutingStore";

const { Text } = Typography;

const BUILT = "已构建";
const CALCULATED = "已计算";
const COMPLETED = "已完成";
const INJECTED = "已注入";
const BUILDING = "构建中";
const CALCULATING = "计算中";
const RUNNING = "运行中";
const INJECTING = "注入中";
const ANALYZING = "分析中";
const EXPIRED = "已过期";
const FAILED = "失败";

export function SimulationRunPage() {
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

  return <SimulationRunContent />;
}

function SimulationRunContent() {
  const { message } = App.useApp();
  const draftProject = useProjectStore((state) => state.draftProject);
  const backendTopologyStatus = useServiceRoutingStore((state) => state.backendTopologyStatus);
  const routeStatus = useServiceRoutingStore((state) => state.routeStatus);
  const nominalStatus = useServiceRoutingStore((state) => state.nominalStatus);
  const faultInjectionStatus = useServiceRoutingStore((state) => state.faultInjectionStatus);
  const faultImpactStatus = useServiceRoutingStore((state) => state.faultImpactStatus);
  const healingExecutionStatus = useServiceRoutingStore((state) => state.healingExecutionStatus);
  const healedRouteStatus = useServiceRoutingStore((state) => state.healedRouteStatus);
  const afterHealingStatus = useServiceRoutingStore((state) => state.afterHealingStatus);
  const indicatorVerificationStatus = useServiceRoutingStore((state) => state.indicatorVerificationStatus);
  const sessionId = useServiceRoutingStore((state) => state.sessionId);
  const nominalTopology = useServiceRoutingStore((state) => state.nominalTopology);
  const nominalRoutes = useServiceRoutingStore((state) => state.nominalRoutes);
  const nominalServices = useServiceRoutingStore((state) => state.nominalServices);
  const nominalMetrics = useServiceRoutingStore((state) => state.nominalMetrics);
  const physicalModelValidation = useServiceRoutingStore((state) => state.physicalModelValidation);
  const physicalModelMetrics = useServiceRoutingStore((state) => state.physicalModelMetrics);
  const faultRecords = useServiceRoutingStore((state) => state.faultRecords);
  const faultedRoutes = useServiceRoutingStore((state) => state.faultedRoutes);
  const faultedTopology = useServiceRoutingStore((state) => state.faultedTopology);
  const beforeHealingServices = useServiceRoutingStore((state) => state.beforeHealingServices);
  const beforeHealingMetrics = useServiceRoutingStore((state) => state.beforeHealingMetrics);
  const faultImpact = useServiceRoutingStore((state) => state.faultImpact);
  const nonRoutingHealingActions = useServiceRoutingStore((state) => state.nonRoutingHealingActions);
  const allHealingActions = useServiceRoutingStore((state) => state.allHealingActions);
  const postActionTopology = useServiceRoutingStore((state) => state.postActionTopology);
  const postActionRoutes = useServiceRoutingStore((state) => state.postActionRoutes);
  const pendingRouteRecalculation = useServiceRoutingStore((state) => state.pendingRouteRecalculation);
  const healedTopology = useServiceRoutingStore((state) => state.healedTopology);
  const healedRoutes = useServiceRoutingStore((state) => state.healedRoutes);
  const afterHealingServices = useServiceRoutingStore((state) => state.afterHealingServices);
  const afterHealingMetrics = useServiceRoutingStore((state) => state.afterHealingMetrics);
  const indicatorChecks = useServiceRoutingStore((state) => state.indicatorChecks);
  const indicatorSummary = useServiceRoutingStore((state) => state.indicatorSummary);
  const artifacts = useServiceRoutingStore((state) => state.artifacts);
  const selectedStage = useServiceRoutingStore((state) => state.selectedStage);
  const selectedServiceId = useServiceRoutingStore((state) => state.selectedServiceId);
  const selectedFaultId = useServiceRoutingStore((state) => state.selectedFaultId);
  const selectedNodeIds = useServiceRoutingStore((state) => state.selectedNodeIds);
  const selectedLinkIds = useServiceRoutingStore((state) => state.selectedLinkIds);
  const error = useServiceRoutingStore((state) => state.error);
  const buildBackendTopology = useServiceRoutingStore((state) => state.buildBackendTopology);
  const calculateRoutes = useServiceRoutingStore((state) => state.calculateRoutes);
  const runNominal = useServiceRoutingStore((state) => state.runNominal);
  const injectFaults = useServiceRoutingStore((state) => state.injectFaults);
  const analyzeFaultImpact = useServiceRoutingStore((state) => state.analyzeFaultImpact);
  const executeHealing = useServiceRoutingStore((state) => state.executeHealing);
  const recalculateHealedRoutes = useServiceRoutingStore((state) => state.recalculateHealedRoutes);
  const runAfterHealing = useServiceRoutingStore((state) => state.runAfterHealing);
  const verifyIndicators = useServiceRoutingStore((state) => state.verifyIndicators);
  const addFault = useServiceRoutingStore((state) => state.addFault);
  const updateFault = useServiceRoutingStore((state) => state.updateFault);
  const duplicateFault = useServiceRoutingStore((state) => state.duplicateFault);
  const deleteFault = useServiceRoutingStore((state) => state.deleteFault);
  const toggleFault = useServiceRoutingStore((state) => state.toggleFault);
  const selectService = useServiceRoutingStore((state) => state.selectService);
  const selectStage = useServiceRoutingStore((state) => state.selectStage);
  const selectFault = useServiceRoutingStore((state) => state.selectFault);
  const selectTopologyNode = useServiceRoutingStore((state) => state.selectTopologyNode);
  const selectTopologyLink = useServiceRoutingStore((state) => state.selectTopologyLink);
  const { data: catalogs } = useCatalogsQuery();

  const scenario = draftProject?.scenario;
  const services = scenario?.services ?? [];
  const nodes = scenario?.nodes ?? [];
  const links = scenario?.links ?? [];
  const faults = scenario?.faults.schedule ?? [];
  const catalogItems = useMemo(() => faultCatalogItems(catalogs?.fault_modes), [catalogs]);
  const faultCatalog = useMemo(() => faultCatalogMap(catalogs?.fault_modes), [catalogs]);
  const selectedService = services.find((service) => service.id === selectedServiceId) ?? services[0] ?? null;
  const selectedFault = faults.find((fault) => fault.id === selectedFaultId) ?? faults[0] ?? null;
  const selectedRoute = selectedService
    ? selectedStage === "before_healing"
      ? faultedRoutes[selectedService.id]
      : selectedStage === "healing_actions"
        ? postActionRoutes[selectedService.id]
        : selectedStage === "after_healing" || selectedStage === "three_stage_comparison" || selectedStage === "indicators"
          ? healedRoutes[selectedService.id]
          : nominalRoutes[selectedService.id]
    : undefined;
  const scenarioDuration = Number(scenario?.scenario.duration_s ?? 120);

  const canRunNominal = Boolean(sessionId) && routeStatus === CALCULATED && nominalStatus !== RUNNING;
  const canInjectFaults = nominalStatus === COMPLETED && faultInjectionStatus !== INJECTING;
  const canAnalyzeFaults = faultInjectionStatus === INJECTED && faultImpactStatus !== ANALYZING;
  const canExecuteHealing = faultImpactStatus === COMPLETED && healingExecutionStatus !== "执行中";
  const canRecalculateRoutes = healingExecutionStatus === "已执行" && healedRouteStatus !== CALCULATING;
  const canRunAfterHealing = healedRouteStatus === CALCULATED && afterHealingStatus !== RUNNING;
  const canVerifyIndicators = afterHealingStatus === COMPLETED && indicatorVerificationStatus !== "验证中";

  const runStep = (runner: () => Promise<void>) => {
    void runner().catch((reason) => message.error(reason instanceof Error ? reason.message : "操作失败"));
  };

  const selectFaultImpactNode = (nodeId: string) => {
    if (snapshotHasNode(faultedTopology, nodeId)) {
      selectStage("before_healing");
      selectTopologyNode(nodeId);
    } else {
      message.warning("对象不存在或无法定位");
    }
  };

  const selectFaultImpactLink = (linkId: string | null) => {
    if (linkId && snapshotHasLink(faultedTopology, linkId)) {
      selectStage("before_healing");
      selectTopologyLink(linkId);
    } else {
      message.warning("对象不存在或无法定位");
    }
  };

  return (
    <div className="simulation-run-page">
      <Card size="small" className="simulation-step-card">
        <Space wrap>
          <Button icon={<SyncOutlined />} loading={backendTopologyStatus === BUILDING} disabled={isAnyBusy(nominalStatus, faultInjectionStatus, faultImpactStatus)} onClick={() => runStep(buildBackendTopology)}>
            ① 构建拓扑
          </Button>
          <Button disabled={backendTopologyStatus !== BUILT || routeStatus === CALCULATING || isAnyBusy(nominalStatus, faultInjectionStatus, faultImpactStatus)} loading={routeStatus === CALCULATING} onClick={() => runStep(calculateRoutes)}>
            ② 计算路径
          </Button>
          <Button type="primary" icon={<PlayCircleOutlined />} disabled={!canRunNominal} loading={nominalStatus === RUNNING} onClick={() => runStep(runNominal)}>
            ③ 运行正常状态
          </Button>
          <Button type="primary" ghost disabled={!canInjectFaults} loading={faultInjectionStatus === INJECTING} onClick={() => runStep(injectFaults)}>
            ④ 注入故障
          </Button>
          <Button type="primary" ghost disabled={!canAnalyzeFaults} loading={faultImpactStatus === ANALYZING} onClick={() => runStep(analyzeFaultImpact)}>
            ⑤ 分析故障影响
          </Button>
          <Button type="primary" ghost disabled={!canExecuteHealing} loading={!canExecuteHealing && faultImpactStatus === COMPLETED} onClick={() => runStep(executeHealing)}>
            ⑥ 执行自愈
          </Button>
          <Button type="primary" ghost disabled={!canRecalculateRoutes} loading={healedRouteStatus === CALCULATING} onClick={() => runStep(recalculateHealedRoutes)}>
            ⑦ 重新计算路径
          </Button>
          <Button type="primary" ghost disabled={!canRunAfterHealing} loading={afterHealingStatus === RUNNING} onClick={() => runStep(runAfterHealing)}>
            ⑧ 运行自愈后状态
          </Button>
          <Button type="primary" ghost disabled={!canVerifyIndicators} loading={!canVerifyIndicators && afterHealingStatus === COMPLETED} onClick={() => runStep(verifyIndicators)}>
            ⑨ 验证技术指标
          </Button>
          <Tag color={statusColor(backendTopologyStatus)}>拓扑：{backendTopologyStatus}</Tag>
          <Tag color={statusColor(routeStatus)}>路径：{routeStatus}</Tag>
          <Tag color={statusColor(nominalStatus)}>正常：{nominalStatus}</Tag>
          <Tag color={statusColor(faultInjectionStatus)}>故障注入：{faultInjectionStatus}</Tag>
          <Tag color={statusColor(faultImpactStatus)}>影响分析：{faultImpactStatus}</Tag>
          <Tag color={statusColor(healingExecutionStatus)}>自愈执行：{healingExecutionStatus}</Tag>
          <Tag color={statusColor(healedRouteStatus)}>恢复路径：{healedRouteStatus}</Tag>
          <Tag color={statusColor(afterHealingStatus)}>自愈后：{afterHealingStatus}</Tag>
          <Tag color={statusColor(indicatorVerificationStatus)}>指标验证：{indicatorVerificationStatus}</Tag>
          {sessionId ? <Tag>Session {sessionId.slice(0, 8)}</Tag> : null}
          {error ? <Tag color="error">{error}</Tag> : null}
        </Space>
        <Typography.Paragraph type="secondary" className="snapshot-note">
          当前为阶段快照模式。时间轴用于配置故障计划；本轮注入操作将所有启用故障作用到“故障后、自愈前”阶段，不代表按时间连续播放。
        </Typography.Paragraph>
      </Card>

      <FaultPlanPanel
        faults={faults}
        nodes={nodes}
        links={links}
        scenarioDuration={scenarioDuration}
        faultCatalog={faultCatalog}
        catalogItems={catalogItems}
        selectedFault={selectedFault}
        onAdd={(type) => addFault(type)}
        onUpdate={updateFault}
        onDuplicate={duplicateFault}
        onDelete={deleteFault}
        onToggle={toggleFault}
        onSelectFault={selectFault}
      />

      <Tabs
        activeKey={selectedStage}
        onChange={(key) => selectStage(key as SelectedStage)}
        items={[
          {
            key: "nominal",
            label: "正常状态",
            children:
              nominalStatus === COMPLETED ? (
                <NominalResults
                  services={services}
                  serviceResults={nominalServices}
                  metrics={nominalMetrics}
                  validation={physicalModelValidation}
                  physicalMetrics={physicalModelMetrics}
                  nodes={nodes}
                  links={links}
                  topology={nominalTopology}
                  selectedService={selectedService}
                  selectedRoute={selectedRoute}
                  onSelectService={selectService}
                />
              ) : (
                <ResultPlaceholder status={nominalStatus} title="正常状态结果" />
              )
          },
          {
            key: "before_healing",
            label: "故障后、自愈前",
            children:
              faultInjectionStatus === INJECTED ? (
                <FaultResults
                  services={services}
                  nodes={nodes}
                  links={links}
                  faultCatalog={faultCatalog}
                  records={faultRecords}
                  topology={faultedTopology}
                  routes={faultedRoutes}
                  selectedService={selectedService}
                  selectedRoute={selectedRoute}
                  selectedNodeIds={selectedNodeIds}
                  selectedLinkIds={selectedLinkIds}
                  onSelectService={selectService}
                  onSelectNode={selectTopologyNode}
                  onSelectLink={selectTopologyLink}
                />
              ) : (
                <ResultPlaceholder status={faultInjectionStatus} title="故障注入结果" />
              )
          },
          {
            key: "healing_actions",
            label: "自愈动作",
            children:
              healingExecutionStatus === "已执行" ? (
                <HealingActionsResults
                  services={services}
                  nodes={nodes}
                  links={links}
                  actions={nonRoutingHealingActions}
                  topology={postActionTopology}
                  routes={postActionRoutes}
                  pendingRouteRecalculation={pendingRouteRecalculation}
                  selectedService={selectedService}
                  selectedRoute={selectedRoute}
                  onSelectService={selectService}
                />
              ) : (
                <ResultPlaceholder status={healingExecutionStatus} title="执行自愈" />
              )
          },
          {
            key: "after_healing",
            label: "自愈后",
            children:
              healedRouteStatus === CALCULATED ? (
                <AfterHealingResults
                  services={services}
                  nodes={nodes}
                  links={links}
                  topology={healedTopology}
                  routes={healedRoutes}
                  selectedService={selectedService}
                  selectedRoute={selectedRoute}
                  actions={allHealingActions}
                  serviceResults={afterHealingServices}
                  metrics={afterHealingMetrics}
                  onSelectService={selectService}
                />
              ) : (
                <ResultPlaceholder status={healedRouteStatus} title="重新计算路径" />
              )
          },
          {
            key: "three_stage_comparison",
            label: "正常—故障对比",
            children:
              faultImpactStatus === COMPLETED && faultImpact ? (
                <ComparisonResults
                  services={services}
                  nominalServices={nominalServices}
                  beforeHealingServices={beforeHealingServices}
                  afterHealingServices={afterHealingServices}
                  beforeHealingMetrics={beforeHealingMetrics}
                  afterHealingMetrics={afterHealingMetrics}
                  faultImpact={faultImpact}
                  onSelectNode={selectFaultImpactNode}
                  onSelectLink={selectFaultImpactLink}
                />
              ) : (
                <ResultPlaceholder status={faultImpactStatus} title="故障影响分析" />
              )
          },
          {
            key: "indicators",
            label: "指标验证与报告",
            children:
              indicatorVerificationStatus === "已完成" && indicatorSummary ? (
                <IndicatorResults sessionId={sessionId} indicators={indicatorChecks} summary={indicatorSummary} artifacts={artifacts} />
              ) : (
                <ResultPlaceholder status={indicatorVerificationStatus} title="指标验证与成果文件" />
              )
          }
        ]}
      />
    </div>
  );
}

function FaultPlanPanel({
  faults,
  nodes,
  links,
  scenarioDuration,
  faultCatalog,
  catalogItems,
  selectedFault,
  onAdd,
  onUpdate,
  onDuplicate,
  onDelete,
  onToggle,
  onSelectFault
}: {
  faults: FaultPayload[];
  nodes: NodePayload[];
  links: LinkPayload[];
  scenarioDuration: number;
  faultCatalog: Map<string, CatalogItemResponse>;
  catalogItems: CatalogItemResponse[];
  selectedFault: FaultPayload | null;
  onAdd: (type?: string) => FaultPayload;
  onUpdate: (faultId: string, patch: Partial<FaultPayload>) => void;
  onDuplicate: (faultId: string) => FaultPayload | null;
  onDelete: (faultId: string) => void;
  onToggle: (faultId: string, enabled: boolean) => void;
  onSelectFault: (faultId: string | null) => void;
}) {
  const columns: ColumnsType<FaultPayload> = [
    { title: "启用", dataIndex: "enabled", width: 72, render: (value, fault) => <Switch size="small" checked={value !== false} onChange={(checked) => onToggle(fault.id, checked)} /> },
    { title: "故障 ID", dataIndex: "id", width: 100 },
    {
      title: "故障类型",
      dataIndex: "type",
      render: (value, fault) => (
        <Select
          className="full-width"
          value={value}
          options={catalogItems.map((item) => ({ value: item.id, label: item.display_name_zh ? `${item.display_name_zh} / ${item.id}` : item.id }))}
          onChange={(type) => updateFaultType(fault, type, faultCatalog, nodes, links, onUpdate)}
        />
      )
    },
    {
      title: "目标",
      dataIndex: "target",
      render: (value, fault) => (
        <Select className="full-width" value={value} options={targetOptions(faultCatalog.get(fault.type), nodes, links, String(value))} onChange={(target) => onUpdate(fault.id, { target })} />
      )
    },
    { title: "开始 s", dataIndex: "start_s", width: 100, render: (value, fault) => <InputNumber min={0} max={scenarioDuration} value={value} onChange={(next) => onUpdate(fault.id, { start_s: Number(next ?? 0) })} /> },
    { title: "持续 s", dataIndex: "duration_s", width: 100, render: (value, fault) => <InputNumber min={0} value={value} onChange={(next) => onUpdate(fault.id, { duration_s: Number(next ?? 0) })} /> },
    { title: "严重度", dataIndex: "severity", width: 110, render: (value, fault) => <InputNumber min={0} max={1} step={0.05} value={value} onChange={(next) => onUpdate(fault.id, { severity: Number(next ?? 0) })} /> },
    {
      title: "状态",
      key: "status",
      width: 130,
      render: (_, fault) => implementationTag(faultCatalog.get(fault.type))
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_, fault) => (
        <Space>
          <Button size="small" onClick={() => onDuplicate(fault.id)}>复制</Button>
          <Popconfirm title="删除该故障？" onConfirm={() => onDelete(fault.id)}>
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Card
      size="small"
      title="故障计划"
      extra={
        <Button icon={<PlusOutlined />} onClick={() => onAdd(catalogItems[0]?.id)}>
          新增故障
        </Button>
      }
    >
      <FaultTimeline faults={faults} duration={scenarioDuration} nodes={nodes} links={links} faultCatalog={faultCatalog} selectedFaultId={selectedFault?.id ?? null} onSelectFault={onSelectFault} />
      <Table
        size="small"
        rowKey="id"
        columns={columns}
        dataSource={faults}
        pagination={false}
        rowClassName={(fault) => (fault.id === selectedFault?.id ? "fault-row-selected" : "")}
        onRow={(fault) => ({ onClick: () => onSelectFault(fault.id) })}
      />
      <FaultPropertyPanel fault={selectedFault} nodes={nodes} links={links} scenarioDuration={scenarioDuration} faultCatalog={faultCatalog} onUpdate={onUpdate} onToggle={onToggle} />
      {catalogItems.some((item) => item.implementation_status === "registered_only") ? (
        <Typography.Paragraph type="secondary">
          “仅登记”表示该故障已纳入故障库，但当前 MVP 尚未实现专属退化作用。
        </Typography.Paragraph>
      ) : null}
    </Card>
  );
}

function FaultTimeline({
  faults,
  duration,
  nodes,
  links,
  faultCatalog,
  selectedFaultId,
  onSelectFault
}: {
  faults: FaultPayload[];
  duration: number;
  nodes: NodePayload[];
  links: LinkPayload[];
  faultCatalog: Map<string, CatalogItemResponse>;
  selectedFaultId: string | null;
  onSelectFault: (faultId: string) => void;
}) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(duration * ratio));
  return (
    <div className="fault-timeline">
      <div className="fault-timeline-scale">
        {ticks.map((tick) => (
          <span key={tick}>{tick}s</span>
        ))}
      </div>
      {faults.map((fault) => {
        const left = duration > 0 ? Math.max(0, Math.min(100, (fault.start_s / duration) * 100)) : 0;
        const width = duration > 0 ? Math.max(2, Math.min(100 - left, (fault.duration_s / duration) * 100)) : 2;
        const catalog = faultCatalog.get(fault.type);
        const tooltip = (
          <Space direction="vertical" size={2}>
            <Text strong>{catalog?.display_name_zh ?? fault.type}</Text>
            <Text>ID：{fault.id}</Text>
            <Text>类型：{fault.type}</Text>
            <Text>目标：{formatTargetDisplay(fault.target, nodes, links)}</Text>
            <Text>开始：{fault.start_s} s</Text>
            <Text>持续：{fault.duration_s} s</Text>
            <Text>结束：{fault.start_s + fault.duration_s} s</Text>
            <Text>严重程度：{fault.severity}</Text>
            <Text>状态：{fault.enabled === false ? "已停用" : "已启用"}</Text>
            <Text>实现：{catalog?.implementation_status === "registered_only" ? "仅登记" : "已实现"}</Text>
          </Space>
        );
        return (
          <div className="fault-timeline-row" key={fault.id}>
            <span className="fault-timeline-label">{fault.id}</span>
            <div className="fault-timeline-track">
              <Tooltip title={tooltip} trigger={["hover", "focus"]}>
                <div
                  role="button"
                  tabIndex={0}
                  className={`fault-timeline-block ${fault.enabled === false ? "disabled" : ""} ${fault.id === selectedFaultId ? "selected" : ""}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                  onClick={() => onSelectFault(fault.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onSelectFault(fault.id);
                  }}
                >
                  {catalog?.display_name_zh ?? fault.type}
                </div>
              </Tooltip>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FaultPropertyPanel({
  fault,
  nodes,
  links,
  scenarioDuration,
  faultCatalog,
  onUpdate,
  onToggle
}: {
  fault: FaultPayload | null;
  nodes: NodePayload[];
  links: LinkPayload[];
  scenarioDuration: number;
  faultCatalog: Map<string, CatalogItemResponse>;
  onUpdate: (faultId: string, patch: Partial<FaultPayload>) => void;
  onToggle: (faultId: string, enabled: boolean) => void;
}) {
  if (!fault) return null;
  const catalog = faultCatalog.get(fault.type);
  const timeWarning = fault.start_s + fault.duration_s > scenarioDuration;
  return (
    <Card size="small" title="选中故障属性" className="fault-warning">
      <Descriptions size="small" column={2} bordered>
        <Descriptions.Item label="ID">{fault.id}</Descriptions.Item>
        <Descriptions.Item label="启用"><Switch size="small" checked={fault.enabled !== false} onChange={(checked) => onToggle(fault.id, checked)} /></Descriptions.Item>
        <Descriptions.Item label="类型">
          <Select
            className="full-width fault-property-type-select"
            value={fault.type}
            options={Array.from(faultCatalog.values()).map((item) => ({ value: item.id, label: item.display_name_zh ? `${item.display_name_zh} / ${item.id}` : item.id }))}
            onChange={(type) => updateFaultType(fault, type, faultCatalog, nodes, links, onUpdate)}
          />
        </Descriptions.Item>
        <Descriptions.Item label="中文名称">{catalog?.display_name_zh ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="目标">
          <Select className="full-width" value={fault.target} options={targetOptions(catalog, nodes, links, fault.target)} onChange={(target) => onUpdate(fault.id, { target })} />
        </Descriptions.Item>
        <Descriptions.Item label="开始时间 s">
          <InputNumber min={0} max={scenarioDuration} value={fault.start_s} onChange={(value) => onUpdate(fault.id, { start_s: Number(value ?? 0) })} />
        </Descriptions.Item>
        <Descriptions.Item label="持续时间 s">
          <InputNumber min={0} value={fault.duration_s} onChange={(value) => onUpdate(fault.id, { duration_s: Number(value ?? 0) })} />
        </Descriptions.Item>
        <Descriptions.Item label="严重度">
          <Space.Compact className="full-width">
            <Slider className="full-width" min={0} max={1} step={0.05} value={fault.severity} onChange={(value) => onUpdate(fault.id, { severity: value })} />
            <InputNumber min={0} max={1} step={0.05} value={fault.severity} onChange={(value) => onUpdate(fault.id, { severity: Number(value ?? 0) })} />
          </Space.Compact>
        </Descriptions.Item>
        <Descriptions.Item label="实现状态">{implementationTag(catalog)}</Descriptions.Item>
        <Descriptions.Item label="描述">{catalog?.description_zh ?? catalog?.description ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="已实现效果">{catalog?.implemented_effect ?? "-"}</Descriptions.Item>
      </Descriptions>
      <Typography.Paragraph type="secondary" className="fault-warning">
        严重度表示故障强度，不是发生概率。
      </Typography.Paragraph>
      {timeWarning ? <Alert className="fault-warning" type="warning" showIcon message="故障结束时间超过场景时长；允许保存，但仿真将按后端阶段模型解释。" /> : null}
    </Card>
  );
}

function NominalResults({
  services,
  serviceResults,
  metrics,
  validation,
  physicalMetrics,
  nodes,
  links,
  topology,
  selectedService,
  selectedRoute,
  onSelectService
}: {
  services: ServicePayload[];
  serviceResults: ServiceSimulationResultResponse[];
  metrics: MetricRowResponse[];
  validation: PhysicalModelValidationItemResponse[];
  physicalMetrics: PhysicalModelMetricsResponse | null;
  nodes: NodePayload[];
  links: LinkPayload[];
  topology: GraphSnapshotResponse | null;
  selectedService: ServicePayload | null;
  selectedRoute?: RouteSnapshotItemResponse;
  onSelectService: (serviceId: string | null) => void;
}) {
  return (
    <Space direction="vertical" className="full-width">
      {topology ? (
        <Card size="small" title="正常拓扑快照">
          <StageTopologyGraph snapshot={topology} projectNodes={nodes} projectLinks={links} selectedRoute={selectedRoute} stage="nominal" />
        </Card>
      ) : null}
      <ServiceResultTable services={services} results={serviceResults} nodes={nodes} onSelectService={onSelectService} />
      <RouteDetails selectedService={selectedService} route={selectedRoute} nodes={nodes} />
      <MetricTable metrics={metrics} />
      <PhysicalValidationTable validation={validation} physicalMetrics={physicalMetrics} />
    </Space>
  );
}

function FaultResults({
  services,
  nodes,
  links,
  faultCatalog,
  records,
  topology,
  routes,
  selectedService,
  selectedRoute,
  selectedNodeIds,
  selectedLinkIds,
  onSelectService,
  onSelectNode,
  onSelectLink
}: {
  services: ServicePayload[];
  nodes: NodePayload[];
  links: LinkPayload[];
  faultCatalog: Map<string, CatalogItemResponse>;
  records: FaultRecordResponse[];
  topology: GraphSnapshotResponse | null;
  routes: Record<string, RouteSnapshotItemResponse>;
  selectedService: ServicePayload | null;
  selectedRoute?: RouteSnapshotItemResponse;
  selectedNodeIds: string[];
  selectedLinkIds: string[];
  onSelectService: (serviceId: string | null) => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectLink: (linkId: string | null) => void;
}) {
  return (
    <Space direction="vertical" className="full-width">
      <FaultRecordTable records={records} faultCatalog={faultCatalog} />
      <TopologySummary snapshot={topology} />
      {topology ? (
        <Card size="small" title="故障后、自愈前拓扑快照">
          <StageTopologyGraph
            snapshot={topology}
            projectNodes={nodes}
            projectLinks={links}
            selectedRoute={selectedRoute}
            selectedNodeIds={selectedNodeIds}
            selectedLinkIds={selectedLinkIds}
            stage="before_healing"
            onNodeClick={onSelectNode}
            onLinkClick={onSelectLink}
          />
        </Card>
      ) : null}
      <FaultedRoutesTable services={services} routes={routes} nodes={nodes} onSelectService={onSelectService} />
      <RouteDetails selectedService={selectedService} route={selectedRoute} nodes={nodes} />
      <Text type="secondary">当前路径为正常阶段继承路径，尚未执行自愈重路由；本页不显示备用路径。</Text>
    </Space>
  );
}

function HealingActionsResults({
  services,
  nodes,
  links,
  actions,
  topology,
  routes,
  pendingRouteRecalculation,
  selectedService,
  selectedRoute,
  onSelectService
}: {
  services: ServicePayload[];
  nodes: NodePayload[];
  links: LinkPayload[];
  actions: HealingActionResponse[];
  topology: GraphSnapshotResponse | null;
  routes: Record<string, RouteSnapshotItemResponse>;
  pendingRouteRecalculation: boolean | null;
  selectedService: ServicePayload | null;
  selectedRoute?: RouteSnapshotItemResponse;
  onSelectService: (serviceId: string | null) => void;
}) {
  return (
    <Space direction="vertical" className="full-width">
      <Alert
        type="warning"
        showIcon
        message="第 6 步只执行非路由自愈动作，不会提前重路由；当前业务路径仍为故障后继承路径。"
        description={`pending_route_recalculation = ${String(pendingRouteRecalculation)}`}
      />
      <HealingActionTable actions={actions} />
      {topology ? (
        <Card size="small" title="策略执行后、重路由前拓扑">
          <StageTopologyGraph snapshot={topology} projectNodes={nodes} projectLinks={links} selectedRoute={selectedRoute} stage="healing_executed" />
        </Card>
      ) : null}
      <FaultedRoutesTable services={services} routes={routes} nodes={nodes} onSelectService={onSelectService} />
      <RouteDetails selectedService={selectedService} route={selectedRoute} nodes={nodes} />
    </Space>
  );
}

function AfterHealingResults({
  services,
  nodes,
  links,
  topology,
  routes,
  selectedService,
  selectedRoute,
  actions,
  serviceResults,
  metrics,
  onSelectService
}: {
  services: ServicePayload[];
  nodes: NodePayload[];
  links: LinkPayload[];
  topology: GraphSnapshotResponse | null;
  routes: Record<string, RouteSnapshotItemResponse>;
  selectedService: ServicePayload | null;
  selectedRoute?: RouteSnapshotItemResponse;
  actions: HealingActionResponse[];
  serviceResults: ServiceSimulationResultResponse[];
  metrics: MetricRowResponse[];
  onSelectService: (serviceId: string | null) => void;
}) {
  return (
    <Space direction="vertical" className="full-width">
      <Alert type="info" showIcon message="自愈成功不等于故障节点恢复正常；本场景通过备用中继和业务策略绕过故障节点。" />
      <HealingActionTable actions={actions} />
      {topology ? (
        <Card size="small" title="自愈后拓扑">
          <StageTopologyGraph snapshot={topology} projectNodes={nodes} projectLinks={links} selectedRoute={selectedRoute} stage="after_healing" />
        </Card>
      ) : null}
      <FaultedRoutesTable services={services} routes={routes} nodes={nodes} onSelectService={onSelectService} />
      <RouteDetails selectedService={selectedService} route={selectedRoute} nodes={nodes} />
      <ServiceResultTable services={services} results={serviceResults} nodes={nodes} onSelectService={onSelectService} />
      <MetricTable metrics={metrics} title="自愈后指标" />
    </Space>
  );
}

function HealingActionTable({ actions }: { actions: HealingActionResponse[] }) {
  return (
    <Card size="small" title="自愈动作记录">
      <Table
        size="small"
        rowKey={(row) => `${row.time_s}:${row.strategy}:${row.target}`}
        dataSource={actions}
        pagination={false}
        columns={[
          { title: "时间 s", dataIndex: "time_s" },
          { title: "策略 ID", dataIndex: "strategy" },
          { title: "目标", dataIndex: "target" },
          { title: "动作", dataIndex: "action" },
          { title: "成功", render: (_, row) => <Tag color={row.success ? "success" : "error"}>{row.success ? "成功" : "失败"}</Tag> },
          { title: "响应 ms", render: (_, row) => formatSimulationNumber(row.measured_response_ms) },
          { title: "备注", dataIndex: "notes" }
        ]}
      />
    </Card>
  );
}

function ComparisonResults({
  services,
  nominalServices,
  beforeHealingServices,
  afterHealingServices,
  beforeHealingMetrics,
  afterHealingMetrics,
  faultImpact,
  onSelectNode,
  onSelectLink
}: {
  services: ServicePayload[];
  nominalServices: ServiceSimulationResultResponse[];
  beforeHealingServices: ServiceSimulationResultResponse[];
  afterHealingServices: ServiceSimulationResultResponse[];
  beforeHealingMetrics: MetricRowResponse[];
  afterHealingMetrics: MetricRowResponse[];
  faultImpact: FaultImpactSummaryResponse;
  onSelectNode: (nodeId: string) => void;
  onSelectLink: (linkId: string | null) => void;
}) {
  const nominalById = new Map(nominalServices.map((item) => [item.service_id, item]));
  const beforeById = new Map(beforeHealingServices.map((item) => [item.service_id, item]));
  const afterById = new Map(afterHealingServices.map((item) => [item.service_id, item]));
  const compareRows = services.map((service) => ({ service, nominal: nominalById.get(service.id), before: beforeById.get(service.id), after: afterById.get(service.id) }));
  return (
    <Space direction="vertical" className="full-width">
      <Card size="small" title="故障影响总览">
        <Space wrap>
          <ObjectTags title="失效节点" values={faultImpact.affected_node_ids} color="error" onClick={(value) => value && onSelectNode(value)} />
          <ObjectTags title="失效链路" values={faultImpact.failed_link_ids} color="error" onClick={onSelectLink} />
          <ObjectTags title="退化链路" values={faultImpact.degraded_link_ids} color="warning" onClick={onSelectLink} />
          <Tag color="error">无效路径 {faultImpact.invalid_service_ids.length}</Tag>
          <Tag color="error">不可达业务 {faultImpact.unreachable_service_ids.length}</Tag>
          <Tag color="warning">QoS 下降 {faultImpact.qos_degraded_service_ids.length}</Tag>
          <Tag>活动节点 {String(faultImpact.summary.active_node_count ?? "-")}</Tag>
          <Tag>活动链路 {String(faultImpact.summary.active_edge_count ?? "-")}</Tag>
        </Space>
      </Card>
      <ThreeStageServiceTable rows={compareRows} />
      <Table
        size="small"
        rowKey={(row) => row.service.id}
        dataSource={compareRows}
        pagination={false}
        scroll={{ x: 1900 }}
        columns={[
          { title: "业务", fixed: "left", render: (_, row) => row.service.name || row.service.id },
          { title: "吞吐 正常", render: (_, row) => metricValue(row.nominal?.throughput_mbps, " Mbps") },
          { title: "吞吐 故障后", render: (_, row) => metricValue(row.before?.throughput_mbps, " Mbps") },
          { title: "吞吐 变化", render: (_, row) => formatDelta(row.nominal?.throughput_mbps, row.before?.throughput_mbps) },
          { title: "时延 正常", render: (_, row) => metricValue(row.nominal?.end_to_end_delay_ms, " ms") },
          { title: "时延 故障后", render: (_, row) => metricValue(row.before?.end_to_end_delay_ms, " ms") },
          { title: "时延 变化", render: (_, row) => formatDelta(row.nominal?.end_to_end_delay_ms, row.before?.end_to_end_delay_ms) },
          { title: "丢包率 正常", render: (_, row) => formatSimulationNumber(row.nominal?.packet_loss_rate ?? null, 6) },
          { title: "丢包率 故障后", render: (_, row) => formatSimulationNumber(row.before?.packet_loss_rate ?? null, 6) },
          { title: "丢包率 变化", render: (_, row) => formatDelta(row.nominal?.packet_loss_rate, row.before?.packet_loss_rate) },
          { title: "可用率 正常", render: (_, row) => formatSimulationNumber(row.nominal?.availability ?? null, 6) },
          { title: "可用率 故障后", render: (_, row) => formatSimulationNumber(row.before?.availability ?? null, 6) },
          { title: "可用率 变化", render: (_, row) => formatDelta(row.nominal?.availability, row.before?.availability) },
          { title: "成功率 正常", render: (_, row) => formatSimulationNumber(row.nominal?.success_rate ?? null, 6) },
          { title: "成功率 故障后", render: (_, row) => formatSimulationNumber(row.before?.success_rate ?? null, 6) },
          { title: "成功率 变化", render: (_, row) => formatDelta(row.nominal?.success_rate, row.before?.success_rate) },
          { title: "中断时间 正常", render: (_, row) => metricValue(row.nominal?.interruption_s, " s") },
          { title: "中断时间 故障后", render: (_, row) => metricValue(row.before?.interruption_s, " s") },
          { title: "中断时间 变化", render: (_, row) => formatDelta(row.nominal?.interruption_s, row.before?.interruption_s) },
          { title: "可达性变化", render: (_, row) => `${boolLabel(row.nominal?.reachable)} -> ${boolLabel(row.before?.reachable)}` },
          { title: "路径有效性变化", render: (_, row) => `${boolLabel(row.nominal?.route_valid)} -> ${boolLabel(row.before?.route_valid)}` }
        ]}
      />
      <MetricDeltaTable deltas={faultImpact.metric_deltas} />
      <MetricTable metrics={beforeHealingMetrics} title="故障后指标" />
      <MetricTable metrics={afterHealingMetrics} title="自愈后指标" />
      <PropagationPanel faultImpact={faultImpact} />
    </Space>
  );
}

function ThreeStageServiceTable({
  rows
}: {
  rows: Array<{
    service: ServicePayload;
    nominal?: ServiceSimulationResultResponse;
    before?: ServiceSimulationResultResponse;
    after?: ServiceSimulationResultResponse;
  }>;
}) {
  return (
    <Card size="small" title="三阶段业务恢复摘要">
      <Table
        size="small"
        rowKey={(row) => row.service.id}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1500 }}
        columns={[
          { title: "业务", fixed: "left", render: (_, row) => row.service.name || row.service.id },
          { title: "吞吐 正常/故障/自愈", render: (_, row) => `${metricValue(row.nominal?.throughput_mbps, " Mbps")} / ${metricValue(row.before?.throughput_mbps, " Mbps")} / ${metricValue(row.after?.throughput_mbps, " Mbps")}` },
          { title: "时延 正常/故障/自愈", render: (_, row) => `${metricValue(row.nominal?.end_to_end_delay_ms, " ms")} / ${metricValue(row.before?.end_to_end_delay_ms, " ms")} / ${metricValue(row.after?.end_to_end_delay_ms, " ms")}` },
          { title: "丢包 正常/故障/自愈", render: (_, row) => `${formatSimulationNumber(row.nominal?.packet_loss_rate ?? null, 6)} / ${formatSimulationNumber(row.before?.packet_loss_rate ?? null, 6)} / ${formatSimulationNumber(row.after?.packet_loss_rate ?? null, 6)}` },
          { title: "成功率 正常/故障/自愈", render: (_, row) => `${formatSimulationNumber(row.nominal?.success_rate ?? null, 6)} / ${formatSimulationNumber(row.before?.success_rate ?? null, 6)} / ${formatSimulationNumber(row.after?.success_rate ?? null, 6)}` },
          { title: "自愈改善", render: (_, row) => formatDelta(row.before?.throughput_mbps, row.after?.throughput_mbps) },
          { title: "与正常差距", render: (_, row) => formatDelta(row.nominal?.throughput_mbps, row.after?.throughput_mbps) },
          { title: "可达", render: (_, row) => `${boolLabel(row.nominal?.reachable)} / ${boolLabel(row.before?.reachable)} / ${boolLabel(row.after?.reachable)}` },
          { title: "路径有效", render: (_, row) => `${boolLabel(row.nominal?.route_valid)} / ${boolLabel(row.before?.route_valid)} / ${boolLabel(row.after?.route_valid)}` },
          { title: "降级", render: (_, row) => `${boolLabel(row.nominal?.degraded)} / ${boolLabel(row.before?.degraded)} / ${boolLabel(row.after?.degraded)}` }
        ]}
      />
      <Typography.Paragraph type="secondary" className="snapshot-note">
        界面汇总值，由后端业务结果和自愈动作记录统计得到；不覆盖后端指标结论。
      </Typography.Paragraph>
    </Card>
  );
}

function IndicatorResults({
  sessionId,
  indicators,
  summary,
  artifacts
}: {
  sessionId: string | null;
  indicators: IndicatorCheckResponse[];
  summary: { applicableCount: number; passedCount: number; failedCount: number; notApplicableCount: number };
  artifacts: ArtifactItemResponse[];
}) {
  const { message } = App.useApp();
  const download = async (filename?: string) => {
    if (!sessionId || !filename) return;
    const blob = filename === "__bundle__" ? await downloadArtifactBundle(sessionId) : await downloadArtifact(sessionId, filename);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename === "__bundle__" ? "lunar_comm_results.zip" : filename;
    link.click();
    URL.revokeObjectURL(url);
    message.success("下载已开始");
  };
  return (
    <Space direction="vertical" className="full-width">
      <Card size="small" title="指标验证结论">
        <Space wrap>
          <Tag>适用 {summary.applicableCount}</Tag>
          <Tag color="success">通过 {summary.passedCount}</Tag>
          <Tag color={summary.failedCount ? "error" : "success"}>未通过 {summary.failedCount}</Tag>
          <Tag>不适用 {summary.notApplicableCount}</Tag>
          {summary.failedCount === 0 ? <Tag color="success">全部适用技术指标通过</Tag> : null}
        </Space>
      </Card>
      <Table
        size="small"
        rowKey="id"
        dataSource={indicators}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: "指标", dataIndex: "indicator" },
          { title: "ID", dataIndex: "id" },
          { title: "层级", dataIndex: "layer" },
          { title: "metric", dataIndex: "metric" },
          { title: "判定", render: (_, row) => `${formatSimulationNumber(row.actual)} ${row.operator} ${formatSimulationNumber(row.threshold)} ${row.unit}` },
          { title: "适用", render: (_, row) => boolLabel(row.applicable) },
          { title: "状态", render: (_, row) => <Tag color={row.status === "passed" ? "success" : row.status === "failed" ? "error" : "default"}>{indicatorStatusLabel(row.status)}</Tag> },
          { title: "不适用原因", render: (_, row) => row.not_applicable_reason || "-" },
          { title: "验证方法", dataIndex: "verification_method" }
        ]}
      />
      <Card size="small" title="成果文件">
        <Button onClick={() => void download("__bundle__")} disabled={!sessionId}>下载全部 ZIP</Button>
        <Table
          size="small"
          rowKey="filename"
          dataSource={artifacts}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "文件名", dataIndex: "filename" },
            { title: "类型", dataIndex: "file_type" },
            { title: "存在", render: (_, row) => boolLabel(row.exists) },
            { title: "大小", render: (_, row) => `${row.size_bytes} B` },
            { title: "用途", render: (_, row) => row.purpose_zh ?? "-" },
            { title: "下载", render: (_, row) => <Button size="small" disabled={!row.exists || !sessionId} onClick={() => void download(row.filename)}>下载</Button> }
          ]}
        />
      </Card>
    </Space>
  );
}

function ServiceResultTable({ services, results, nodes, onSelectService }: { services: ServicePayload[]; results: ServiceSimulationResultResponse[]; nodes: NodePayload[]; onSelectService: (serviceId: string) => void }) {
  const serviceNames = new Map(services.map((service) => [service.id, service.name || service.id]));
  return (
    <Table
      size="small"
      rowKey="service_id"
      dataSource={results}
      pagination={false}
      scroll={{ x: 1500 }}
      onRow={(record) => ({ onClick: () => onSelectService(record.service_id) })}
      columns={[
        { title: "业务名称", fixed: "left", render: (_, row) => serviceNames.get(row.service_id) ?? row.service_id },
        { title: "业务 ID", dataIndex: "service_id" },
        { title: "源节点", render: (_, row) => formatNodeDisplay(row.source, nodes) },
        { title: "目标节点", render: (_, row) => formatNodeDisplay(row.target, nodes) },
        { title: "可达", render: (_, row) => <Tag color={row.reachable ? "success" : "error"}>{row.reachable ? "可达" : "不可达"}</Tag> },
        { title: "路径有效", render: (_, row) => <Tag color={row.route_valid ? "success" : "error"}>{row.route_valid ? "有效" : "无效"}</Tag> },
        { title: "需求带宽", render: (_, row) => `${formatSimulationNumber(row.demand_mbps)} Mbps` },
        { title: "吞吐", render: (_, row) => `${formatSimulationNumber(row.throughput_mbps)} Mbps` },
        { title: "端到端时延", render: (_, row) => metricValue(row.end_to_end_delay_ms, " ms") },
        { title: "丢包率", render: (_, row) => formatSimulationNumber(row.packet_loss_rate, 6) },
        { title: "可用率", render: (_, row) => formatSimulationNumber(row.availability, 6) },
        { title: "成功率", render: (_, row) => formatSimulationNumber(row.success_rate, 6) },
        { title: "中断时间", render: (_, row) => `${formatSimulationNumber(row.interruption_s)} s` },
        { title: "是否降级", render: (_, row) => (row.degraded ? <Tag color="warning">降级</Tag> : <Tag>否</Tag>) },
        { title: "路由来源", render: (_, row) => row.route_source ?? "-" },
        { title: "失败原因", render: (_, row) => row.failure_reason || "-" },
        { title: "备注", render: (_, row) => row.notes || "-" }
      ]}
    />
  );
}

function FaultRecordTable({ records, faultCatalog }: { records: FaultRecordResponse[]; faultCatalog: Map<string, CatalogItemResponse> }) {
  return (
    <Table
      size="small"
      rowKey="fault_id"
      dataSource={records}
      pagination={false}
      columns={[
        { title: "故障 ID", dataIndex: "fault_id" },
        { title: "故障类型", render: (_, row) => faultCatalog.get(row.fault_type)?.display_name_zh ?? row.fault_type },
        { title: "目标", dataIndex: "target" },
        { title: "开始", render: (_, row) => `${row.start_s}s` },
        { title: "持续", render: (_, row) => `${row.duration_s}s` },
        { title: "严重度", dataIndex: "severity" },
        { title: "实际施加效果", render: (_, row) => translateAppliedEffect(row.applied_effect) }
      ]}
    />
  );
}

function FaultedRoutesTable({ services, routes, nodes, onSelectService }: { services: ServicePayload[]; routes: Record<string, RouteSnapshotItemResponse>; nodes: NodePayload[]; onSelectService: (serviceId: string) => void }) {
  return (
    <Table
      size="small"
      rowKey="id"
      dataSource={services}
      pagination={false}
      onRow={(record) => ({ onClick: () => onSelectService(record.id) })}
      columns={[
        { title: "业务", render: (_, service) => service.name || service.id },
        { title: "路径状态", render: (_, service) => <Tag color={routes[service.id]?.valid ? "success" : "error"}>{routes[service.id]?.valid ? "有效" : "无效"}</Tag> },
        { title: "路由来源", render: (_, service) => routes[service.id]?.route_source ?? "-" },
        { title: "完整路径", render: (_, service) => routes[service.id]?.path.map((nodeId) => formatNodeDisplay(nodeId, nodes)).join(" -> ") || "-" }
      ]}
    />
  );
}

function RouteDetails({ selectedService, route, nodes }: { selectedService: ServicePayload | null; route?: RouteSnapshotItemResponse; nodes: NodePayload[] }) {
  if (!selectedService) return null;
  if (!route) return <Card size="small"><Text type="secondary">尚无当前业务路径。</Text></Card>;
  return (
    <Descriptions size="small" column={1} bordered>
      <Descriptions.Item label="业务">{selectedService.name || selectedService.id}</Descriptions.Item>
      <Descriptions.Item label="源节点">{formatNodeDisplay(route.source, nodes)}</Descriptions.Item>
      <Descriptions.Item label="目标节点">{formatNodeDisplay(route.target, nodes)}</Descriptions.Item>
      <Descriptions.Item label="路径状态">{route.valid ? "有效" : "无效"}</Descriptions.Item>
      <Descriptions.Item label="路由来源">{route.route_source ?? "-"}</Descriptions.Item>
      <Descriptions.Item label="完整路径">{route.path.map((nodeId) => formatNodeDisplay(nodeId, nodes)).join(" -> ") || "-"}</Descriptions.Item>
      <Descriptions.Item label="备注">{route.notes || "-"}</Descriptions.Item>
    </Descriptions>
  );
}

function TopologySummary({ snapshot }: { snapshot: GraphSnapshotResponse | null }) {
  if (!snapshot) return null;
  return (
    <Card size="small" title="故障拓扑快照">
      <Space wrap>
        <Tag>节点 {String(snapshot.summary.node_count ?? "-")}</Tag>
        <Tag>链路 {String(snapshot.summary.edge_count ?? "-")}</Tag>
        <Tag color="success">活动节点 {String(snapshot.summary.active_node_count ?? "-")}</Tag>
        <Tag color="success">活动链路 {String(snapshot.summary.active_edge_count ?? "-")}</Tag>
        <Tag color="error">失效节点 {snapshot.nodes.filter((node) => node.active === false).length}</Tag>
        <Tag color="error">失效链路 {snapshot.links.filter((link) => link.active === false || link.availability === 0).length}</Tag>
      </Space>
    </Card>
  );
}

function MetricTable({ metrics, title = "指标" }: { metrics: MetricRowResponse[]; title?: string }) {
  return (
    <Card size="small" title={title}>
      <Table
        size="small"
        rowKey={(row) => `${row.phase}:${row.layer}:${row.metric}`}
        dataSource={metrics}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: "阶段", dataIndex: "phase" },
          { title: "分组", render: (_, row) => metricMeta(row.layer, row.metric).group },
          { title: "层级", dataIndex: "layer" },
          { title: "指标中文名", render: (_, row) => metricMeta(row.layer, row.metric).label },
          { title: "原始指标 ID", dataIndex: "metric" },
          { title: "值", render: (_, row) => `${formatSimulationNumber(row.value)}${metricMeta(row.layer, row.metric).unit ? ` ${metricMeta(row.layer, row.metric).unit}` : ""}` }
        ]}
      />
    </Card>
  );
}

function MetricDeltaTable({ deltas }: { deltas: MetricDeltaResponse[] }) {
  return (
    <Card size="small" title="指标差值分析">
      <Table
        size="small"
        rowKey={(row) => `${row.layer}:${row.metric}`}
        dataSource={deltas}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: "分组", render: (_, row) => metricMeta(row.layer, row.metric).group },
          { title: "层级", dataIndex: "layer" },
          { title: "指标中文名", render: (_, row) => metricMeta(row.layer, row.metric).label },
          { title: "原始指标 ID", dataIndex: "metric" },
          { title: "正常值", render: (_, row) => formatSimulationNumber(row.nominal_value) },
          { title: "故障后值", render: (_, row) => formatSimulationNumber(row.before_healing_value) },
          { title: "变化量", render: (_, row) => formatSimulationNumber(row.delta) },
          { title: "变化方向", render: (_, row) => deltaDirection(row.delta) }
        ]}
      />
    </Card>
  );
}

function PhysicalValidationTable({ validation, physicalMetrics }: { validation: PhysicalModelValidationItemResponse[]; physicalMetrics: PhysicalModelMetricsResponse | null }) {
  return (
    <Card size="small" title="物理模型验证">
      <Table
        size="small"
        rowKey="model"
        dataSource={validation}
        pagination={false}
        columns={[
          { title: "模型", render: (_, row) => physicalModelLabel(row.model) },
          { title: "原始 ID", dataIndex: "model" },
          { title: "预测值", render: (_, row) => formatSimulationNumber(row.predicted_value ?? null) },
          { title: "参考值", render: (_, row) => formatSimulationNumber(row.reference_value ?? null) },
          { title: "误差 %", render: (_, row) => formatSimulationNumber(row.error_pct ?? null) },
          { title: "目标误差 %", render: (_, row) => formatSimulationNumber(row.target_error_pct ?? null) },
          { title: "结果", render: (_, row) => <Tag color={row.passed ? "success" : "error"}>{row.passed ? "通过" : "未通过"}</Tag> },
          { title: "参考来源", dataIndex: "reference_source" },
          { title: "验证方法", dataIndex: "verification_method" }
        ]}
      />
      <Descriptions size="small" column={3} bordered className="compact-descriptions">
        {Object.entries(physicalMetrics ?? {}).map(([key, value]) => (
          <Descriptions.Item key={key} label={physicalMetricLabel(key)}>{formatSimulationNumber(value as never)}</Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  );
}

function PropagationPanel({ faultImpact }: { faultImpact: FaultImpactSummaryResponse }) {
  return (
    <Card size="small" title="故障传播分析">
      <Space direction="vertical" className="full-width">
        <Table size="small" rowKey={(row) => `${row.root_fault}:${row.predicted_effect}`} dataSource={faultImpact.propagation_predictions} pagination={false} columns={[
          { title: "根故障", dataIndex: "root_fault" },
          { title: "预测影响", dataIndex: "predicted_effect" },
          { title: "预测层级", dataIndex: "predicted_layer" },
          { title: "预测概率", render: (_, row) => formatSimulationNumber(row.predicted_probability) },
          { title: "预测传播时延 ms", render: (_, row) => formatSimulationNumber(row.predicted_delay_ms) },
          { title: "传播路径", dataIndex: "propagation_path" },
          { title: "置信度", render: (_, row) => formatSimulationNumber(row.confidence) }
        ]} />
        <Table size="small" rowKey={(row) => `${row.source}:${row.observed_effect}`} dataSource={faultImpact.observed_impacts} pagination={false} columns={[
          { title: "观测影响", dataIndex: "observed_effect" },
          { title: "观测层级", dataIndex: "observed_layer" },
          { title: "数据来源", dataIndex: "source" },
          { title: "观测时延 ms", render: (_, row) => formatSimulationNumber(row.observed_delay_ms) },
          { title: "证据", dataIndex: "evidence" }
        ]} />
        <Table size="small" rowKey={(row) => row.predicted_effect} dataSource={faultImpact.propagation_comparison} pagination={false} columns={[
          { title: "预测影响", dataIndex: "predicted_effect" },
          { title: "观测到", render: (_, row) => <Tag color={row.observed ? "success" : "default"}>{row.observed ? "是" : "否"}</Tag> },
          { title: "TP/FP/FN", render: (_, row) => comparisonTags(row.true_positive, row.false_positive, row.false_negative) },
          { title: "预测时延 ms", render: (_, row) => formatSimulationNumber(row.predicted_delay_ms) },
          { title: "观测时延 ms", render: (_, row) => formatSimulationNumber(row.observed_delay_ms) },
          { title: "时延误差 %", render: (_, row) => formatSimulationNumber(row.delay_error_pct) }
        ]} />
        <Descriptions size="small" column={3} bordered>
          {Object.entries(faultImpact.propagation_metrics ?? {}).map(([key, value]) => (
            <Descriptions.Item key={key} label={`${propagationMetricLabel(key)} (${key})`}>{formatSimulationNumber(value as never)}</Descriptions.Item>
          ))}
        </Descriptions>
      </Space>
    </Card>
  );
}

function ResultPlaceholder({ status, title }: { status: string; title: string }) {
  return (
    <Card size="small" title={title}>
      <Empty description={`当前状态：${status}`} />
    </Card>
  );
}

function ObjectTags({ title, values, color, onClick }: { title: string; values: Array<string | null>; color: "error" | "warning"; onClick: (value: string | null) => void }) {
  return (
    <>
      <Tag color={color}>{title} {values.length}</Tag>
      {values.slice(0, 8).map((value, index) => (
        <Tag className="clickable-tag" key={`${title}:${value ?? "null"}:${index}`} color={color} onClick={() => onClick(value)}>
          {value ?? "未命名对象"}
        </Tag>
      ))}
    </>
  );
}

function updateFaultType(
  fault: FaultPayload,
  type: string,
  faultCatalog: Map<string, CatalogItemResponse>,
  nodes: NodePayload[],
  links: LinkPayload[],
  onUpdate: (faultId: string, patch: Partial<FaultPayload>) => void
): void {
  const catalog = faultCatalog.get(type);
  const target = targetIsValidForScope(fault.target, catalog, nodes, links)
    ? fault.target
    : defaultTargetForScope(catalog, nodes, links);
  onUpdate(fault.id, { type, target });
}

function targetIsValidForScope(target: string, catalog: CatalogItemResponse | undefined, nodes: NodePayload[], links: LinkPayload[]): boolean {
  const scope = catalog?.target_scope ?? "node_or_link";
  if (scope === "global") return target === "global";
  if (scope === "all_rf_links") return target === "all_rf_links";
  const isNode = nodes.some((node) => node.id === target);
  const isLink = links.some((link, index) => (link.id || linkKey(link, index)) === target);
  if (scope === "node") return isNode;
  if (scope === "link") return isLink;
  return isNode || isLink;
}

function formatTargetDisplay(target: string, nodes: NodePayload[], links: LinkPayload[]): string {
  const node = nodes.find((item) => item.id === target);
  if (node) return formatNodeDisplay(target, nodes);
  const link = links.find((item, index) => (item.id || linkKey(item, index)) === target);
  if (link) return `${link.name || link.id || "链路"}（${link.source} -> ${link.target}）`;
  if (target === "all_rf_links") return "全部射频链路（all_rf_links）";
  if (target === "global") return "全局网络（global）";
  return `${target}（历史或自定义目标）`;
}

function targetOptions(catalog: CatalogItemResponse | undefined, nodes: NodePayload[], links: LinkPayload[], currentTarget?: string): DefaultOptionType[] {
  const scope = catalog?.target_scope ?? "node_or_link";
  const nodeOptions = nodes.map((node) => ({ value: node.id, label: `${formatNodeDisplay(node.id, nodes)} / ${node.type}${node.active === false ? " / 停用" : ""}` }));
  const linkOptions = links.map((link, index) => ({ value: link.id || linkKey(link, index), label: `${link.name || link.id || "链路"} / ${link.source} -> ${link.target}` }));
  let options: DefaultOptionType[];
  if (scope === "global") options = [{ value: "global", label: "全局网络" }];
  else if (scope === "all_rf_links") options = [{ value: "all_rf_links", label: "全部射频链路（all_rf_links）" }];
  else if (scope === "link") options = linkOptions;
  else if (scope === "node_or_link") options = [{ label: "节点", options: nodeOptions }, { label: "链路", options: linkOptions }];
  else options = nodeOptions;

  if (currentTarget && !optionContains(options, currentTarget)) {
    options = [{ value: currentTarget, label: `${currentTarget} / 历史或自定义目标` }, ...options];
  }
  return options;
}

function defaultTargetForScope(catalog: CatalogItemResponse | undefined, nodes: NodePayload[], links: LinkPayload[]): string {
  const options = targetOptions(catalog, nodes, links);
  const first = options[0];
  if (first && "options" in first && Array.isArray(first.options)) return String(first.options[0]?.value ?? "global");
  return String(first?.value ?? "global");
}

function optionContains(options: DefaultOptionType[], value: string): boolean {
  return options.some((option) => {
    if (option.value === value) return true;
    return Array.isArray(option.options) ? optionContains(option.options, value) : false;
  });
}

function implementationTag(item: CatalogItemResponse | undefined) {
  return item?.implementation_status === "registered_only" ? <Tag color="warning">仅登记</Tag> : <Tag color="success">已实现</Tag>;
}

function statusColor(status: string): string {
  if ([BUILT, CALCULATED, COMPLETED, INJECTED, "已执行", "已完成"].includes(status)) return "success";
  if ([BUILDING, CALCULATING, RUNNING, INJECTING, ANALYZING, "执行中", "验证中"].includes(status)) return "processing";
  if (status === EXPIRED) return "warning";
  if (status === FAILED) return "error";
  return "default";
}

function isAnyBusy(...statuses: string[]): boolean {
  return statuses.some((status) => [RUNNING, INJECTING, ANALYZING, "执行中", "验证中"].includes(status));
}

function formatNodeDisplay(nodeId: string, nodes: NodePayload[]): string {
  const node = nodes.find((item) => item.id === nodeId);
  if (!node) return `${nodeId}（节点不存在）`;
  return node.name ? `${node.name}（${node.id}）` : node.id;
}

function translateAppliedEffect(effect: string): string {
  if (effect === "fault registered without additional MVP degradation") {
    return "故障已登记，但当前 MVP 未施加专属退化作用。";
  }
  return effect;
}

function formatDelta(before: unknown, after: unknown): string {
  const left = finiteNumber(before as never);
  const right = finiteNumber(after as never);
  if (left == null || right == null) return "无法比较";
  return formatSimulationNumber(right - left);
}

function deltaDirection(delta: MetricDeltaResponse["delta"]): string {
  const value = finiteNumber(delta);
  if (value == null) return "无法比较";
  if (value > 0) return "增加";
  if (value < 0) return "下降";
  return "不变";
}

function metricValue(value: unknown, unit = ""): string {
  return `${formatSimulationNumber(value as never)}${unit}`;
}

function boolLabel(value: boolean | undefined): string {
  if (value == null) return "未知";
  return value ? "是" : "否";
}

function indicatorStatusLabel(status: IndicatorCheckResponse["status"]): string {
  if (status === "passed") return "通过";
  if (status === "failed") return "未通过";
  return "不适用";
}

function metricMeta(layer: string, metric: string): { group: string; label: string; unit: string } {
  const key = `${layer}:${metric}`;
  const map: Record<string, { group: string; label: string; unit: string }> = {
    "physical:rf_lifetime_prediction_error_pct": { group: "物理", label: "射频寿命预测误差", unit: "%" },
    "physical:dust_gain_loss_quantification_error_pct": { group: "物理", label: "月尘增益损耗量化误差", unit: "%" },
    "network:availability": { group: "网络", label: "网络可用率", unit: "" },
    "network:active_edge_count": { group: "网络", label: "活动链路数", unit: "条" },
    "network:active_node_count": { group: "网络", label: "活动节点数", unit: "个" },
    "service:throughput_mbps": { group: "业务", label: "吞吐", unit: "Mbps" },
    "service:end_to_end_delay_ms": { group: "业务", label: "端到端时延", unit: "ms" },
    "service:packet_loss_rate": { group: "业务", label: "丢包率", unit: "" },
    "service:success_rate": { group: "业务", label: "成功率", unit: "" },
    "service:interruption_s": { group: "业务", label: "中断时间", unit: "s" },
    "propagation:cascading_fault_prediction_accuracy": { group: "传播", label: "级联故障预测准确率", unit: "" },
    "propagation:fault_propagation_delay_error_pct": { group: "传播", label: "故障传播时延误差", unit: "%" }
  };
  return map[key] ?? { group: layerGroup(layer), label: metric, unit: "" };
}

function layerGroup(layer: string): string {
  if (layer === "physical") return "物理";
  if (layer === "network") return "网络";
  if (layer === "service") return "业务";
  if (layer === "propagation") return "传播";
  return "其他";
}

function physicalModelLabel(model: string): string {
  if (model === "rf_lifetime") return "射频寿命预测";
  if (model === "dust_gain_loss") return "月尘增益损耗量化";
  return model;
}

function physicalMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    rf_lifetime_prediction_error_pct: "射频寿命预测误差 %",
    dust_gain_loss_quantification_error_pct: "月尘增益损耗量化误差 %",
    predicted_rf_lifetime_h: "预测射频寿命 h",
    reference_rf_lifetime_h: "参考射频寿命 h",
    predicted_gain_loss_db: "预测增益损耗 dB",
    reference_gain_loss_db: "参考增益损耗 dB"
  };
  return labels[metric] ?? metric;
}

function propagationMetricLabel(metric: string): string {
  const labels: Record<string, string> = {
    cascading_fault_prediction_accuracy: "级联故障预测准确率",
    fault_propagation_delay_error_pct: "故障传播时延误差",
    propagation_true_positive_count: "传播真阳性数",
    propagation_false_positive_count: "传播假阳性数",
    propagation_false_negative_count: "传播假阴性数"
  };
  return labels[metric] ?? metric;
}

function comparisonTags(tp: boolean, fp: boolean, fn: boolean) {
  return (
    <Space size={4}>
      {tp ? <Tag color="success">TP</Tag> : null}
      {fp ? <Tag color="error">FP</Tag> : null}
      {fn ? <Tag color="warning">FN</Tag> : null}
      {!tp && !fp && !fn ? <Tag>无</Tag> : null}
    </Space>
  );
}

function snapshotHasNode(snapshot: GraphSnapshotResponse | null, nodeId: string): boolean {
  return Boolean(snapshot?.nodes.some((node) => node.id === nodeId));
}

function snapshotHasLink(snapshot: GraphSnapshotResponse | null, linkId: string): boolean {
  return Boolean(snapshot?.links.some((link, index) => (link.id || linkKey(link as LinkPayload, index)) === linkId));
}

function linkKey(link: Pick<LinkPayload, "source" | "target" | "id">, index: number): string {
  return link.id || `${link.source}__${link.target}__${index}`;
}
