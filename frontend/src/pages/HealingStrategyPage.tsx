import { Alert, Button, Card, Empty, Space, Switch, Tag, Typography } from "antd";
import { useCatalogsQuery } from "../api/catalogs";
import { HEALING_STRATEGY_IDS, healingCatalogItems, healingPreconditionHint, normalizeHealingEnabled } from "../features/healing/healingCatalog";
import { useProjectStore } from "../stores/projectStore";
import { useServiceRoutingStore } from "../stores/serviceRoutingStore";

export function HealingStrategyPage() {
  const draftProject = useProjectStore((state) => state.draftProject);
  const updateDraftScenario = useProjectStore((state) => state.updateDraftScenario);
  const invalidateRuntime = useServiceRoutingStore((state) => state.invalidateRuntime);
  const { data: catalogs } = useCatalogsQuery();

  if (!draftProject) {
    return (
      <div className="page-fill">
        <Empty description="请先新建或打开项目" />
      </div>
    );
  }

  const scenario = draftProject.scenario;
  const items = healingCatalogItems(catalogs?.healing_strategies);
  const enabled = normalizeHealingEnabled(scenario.healing.enabled ?? []);
  const enabledSet = new Set(enabled);

  const setEnabled = (next: string[]) => {
    const normalized = normalizeHealingEnabled(next);
    updateDraftScenario((base) => ({
      ...base,
      healing: {
        ...base.healing,
        enabled: normalized
      }
    }));
    invalidateRuntime("healing_changed");
  };

  const toggle = (id: string, checked: boolean) => {
    setEnabled(checked ? [...enabled, id] : enabled.filter((item) => item !== id));
  };

  return (
    <div className="page-fill">
      <div className="page-header">
        <div>
          <Typography.Title level={4}>自愈策略</Typography.Title>
          <Typography.Text type="secondary">{draftProject.name}</Typography.Text>
        </div>
        <Space wrap>
          <Tag color={enabled.length ? "success" : "warning"}>已启用 {enabled.length} / {HEALING_STRATEGY_IDS.length}</Tag>
          <Button onClick={() => setEnabled([...HEALING_STRATEGY_IDS])}>全部启用</Button>
          <Button onClick={() => setEnabled([])}>全部停用</Button>
          <Button onClick={() => setEnabled([...HEALING_STRATEGY_IDS])}>恢复默认</Button>
        </Space>
      </div>
      {enabled.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="未启用任何自愈策略。第 6-9 步仍可按状态机执行，但网络可能无法恢复。"
        />
      ) : null}
      <div className="healing-strategy-grid">
        {items.map((item) => (
          <Card
            key={item.id}
            size="small"
            title={item.display_name_zh ?? item.id}
            extra={<Switch checked={enabledSet.has(item.id)} onChange={(checked) => toggle(item.id, checked)} />}
          >
            <Space direction="vertical" className="full-width">
              <Space wrap>
                <Tag>{item.id}</Tag>
                <Tag color={item.execution_step === 7 ? "blue" : "green"}>第 {item.execution_step} 步</Tag>
                <Tag>{item.strategy_category === "routing" ? "路由策略" : "非路由策略"}</Tag>
                <Tag color="success">{item.implementation_status}</Tag>
              </Space>
              <Typography.Paragraph>{item.description_zh ?? item.description}</Typography.Paragraph>
              <Typography.Text type="secondary">作用：{item.implemented_effect ?? "-"}</Typography.Text>
              <Typography.Text type="secondary">目标：{item.target_summary_zh ?? "-"}</Typography.Text>
              <Typography.Text type="secondary">前置条件：{item.preconditions_zh ?? "-"}</Typography.Text>
              <Alert type="info" showIcon message={healingPreconditionHint(item.id, scenario)} />
            </Space>
          </Card>
        ))}
      </div>
    </div>
  );
}
