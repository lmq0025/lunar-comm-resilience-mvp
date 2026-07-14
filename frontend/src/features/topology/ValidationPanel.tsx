import { Alert, Button, Card, Descriptions, Empty, List, Space, Tag } from "antd";
import type { ScenarioValidationResponse, ValidationIssueResponse } from "../../api/contracts";
import { useProjectStore } from "../../stores/projectStore";
import { useTopologyEditorStore } from "../../stores/topologyEditorStore";
import type { LunarProjectDocument } from "../../types/project";
import type { SelectedElement } from "../../types/topology";

export function ValidationPanel({
  validating,
  onValidate,
  onLocate
}: {
  validating: boolean;
  onValidate: () => void;
  onLocate?: (selection: SelectedElement) => void;
}) {
  const status = useProjectStore((state) => state.validationStatus);
  const result = useProjectStore((state) => state.validationResult);

  return (
    <Card title="场景验证" size="small" className="tool-card">
      <Space direction="vertical" className="full-width">
        <Space>
          <Tag color={status === "验证通过" ? "success" : status === "验证失败" ? "error" : status === "验证结果已过期" ? "warning" : "default"}>
            {status}
          </Tag>
          <Button type="primary" loading={validating} onClick={onValidate}>
            验证当前场景
          </Button>
        </Space>
        {result ? <ValidationResult result={result} onLocate={onLocate} /> : <Empty description="尚无验证结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Space>
    </Card>
  );
}

function ValidationResult({ result, onLocate }: { result: ScenarioValidationResponse; onLocate?: (selection: SelectedElement) => void }) {
  return (
    <Space direction="vertical" className="full-width">
      <Alert type={result.valid ? "success" : "error"} showIcon message={result.valid ? "验证通过" : "验证失败"} />
      <Descriptions size="small" bordered column={2}>
        <Descriptions.Item label="节点数">{String(result.summary.node_count ?? "-")}</Descriptions.Item>
        <Descriptions.Item label="链路数">{String(result.summary.link_count ?? "-")}</Descriptions.Item>
        <Descriptions.Item label="业务数">{String(result.summary.service_count ?? "-")}</Descriptions.Item>
        <Descriptions.Item label="故障数">{String(result.summary.fault_count ?? "-")}</Descriptions.Item>
        <Descriptions.Item label="指标数">{String(result.summary.indicator_count ?? "-")}</Descriptions.Item>
      </Descriptions>
      <IssueList title="错误列表" issues={result.errors} onLocate={onLocate} />
      <IssueList title="警告列表" issues={result.warnings} onLocate={onLocate} />
    </Space>
  );
}

function IssueList({ title, issues, onLocate }: { title: string; issues: ValidationIssueResponse[]; onLocate?: (selection: SelectedElement) => void }) {
  const locateIssue = useLocateIssue(onLocate);
  return (
    <List
      size="small"
      header={title}
      dataSource={issues}
      locale={{ emptyText: "无" }}
      renderItem={(item) => (
        <List.Item>
          <Button type="link" className="issue-button" onClick={() => locateIssue(item)}>
            {translateIssue(item)}
          </Button>
        </List.Item>
      )}
    />
  );
}

function useLocateIssue(onLocate?: (selection: SelectedElement) => void) {
  const draftProject = useProjectStore((state) => state.draftProject);
  const selectElement = useTopologyEditorStore((state) => state.selectElement);
  return (issue: ValidationIssueResponse) => {
    const match = /^(nodes|links)\.(\d+)/.exec(issue.field);
    if (!match || !draftProject) return;
    const index = Number(match[2]);
    const selection = match[1] === "nodes" ? nodeSelection(draftProject, index) : edgeSelection(draftProject, index);
    if (!selection) return;
    selectElement(selection);
    onLocate?.(selection);
  };
}

function nodeSelection(project: LunarProjectDocument, index: number): SelectedElement | null {
  const node = project.scenario.nodes[index];
  return node ? { kind: "node", id: node.id } : null;
}

function edgeSelection(project: LunarProjectDocument, index: number): SelectedElement | null {
  const edge = project.scenario.links[index];
  return edge ? { kind: "edge", id: edge.id || `${edge.source}__${edge.target}__${index}` } : null;
}

function translateIssue(issue: ValidationIssueResponse): string {
  const field = issue.field.replace("nodes", "节点").replace("links", "链路").replace("services", "业务").replace("faults", "故障");
  return `${field}: ${translateMessage(issue.message)}（详细信息：${issue.message}）`;
}

function translateMessage(message: string): string {
  const translations: Array<[RegExp, string]> = [
    [/duplicate node id/i, "节点 ID 重复"],
    [/unknown source node/i, "链路源节点不存在"],
    [/unknown target node/i, "链路目标节点不存在"],
    [/Service .* references an unknown node/i, "业务引用了不存在的节点"],
    [/unknown fault type/i, "未知故障类型"],
    [/unknown healing strategy/i, "未知自愈策略"]
  ];
  return translations.find(([pattern]) => pattern.test(message))?.[1] ?? "场景数据存在问题";
}
