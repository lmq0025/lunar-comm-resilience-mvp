import { useCallback, useEffect, useState } from "react";
import { ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import { Alert, App, Button, Descriptions, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { listRuns, restoreRunSession } from "../api/runs";
import type { SimulationRunResponse } from "../api/contracts";
import { useProjectStore } from "../stores/projectStore";
import { restorePersistedRun } from "../stores/serviceRoutingStore";
import { useUiStore } from "../stores/uiStore";

export function RunHistoryPage() {
  const { message } = App.useApp();
  const draftProject = useProjectStore((state) => state.draftProject);
  const setActiveMenu = useUiStore((state) => state.setActiveMenu);
  const [runs, setRuns] = useState<SimulationRunResponse[]>([]);
  const [selected, setSelected] = useState<SimulationRunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listRuns(draftProject?.projectId ?? null);
      setRuns(response.runs);
      setSelected((current) => response.runs.find((run) => run.run_id === current?.run_id) ?? response.runs[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run history");
    } finally {
      setLoading(false);
    }
  }, [draftProject?.projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const restore = async (run: SimulationRunResponse) => {
    setLoading(true);
    try {
      const response = await restoreRunSession(run.run_id);
      restorePersistedRun(response.run, response.session.session_id);
      message.success("运行状态和各步骤结果已恢复");
      setActiveMenu("simulation");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<SimulationRunResponse> = [
    { title: "运行 ID", dataIndex: "run_id", ellipsis: true },
    { title: "场景", dataIndex: "scenario_name", ellipsis: true },
    { title: "状态", dataIndex: "status", render: (value) => <Tag color={value === "completed" ? "success" : "processing"}>{value}</Tag> },
    { title: "当前步骤", dataIndex: "current_step" },
    { title: "步骤", render: (_, run) => `${run.completed_steps.length}/9` },
    { title: "更新时间", dataIndex: "updated_at", render: (value) => new Date(value).toLocaleString() },
    {
      title: "Action",
      render: (_, run) => (
        <Button size="small" icon={<RollbackOutlined />} onClick={() => restore(run)}>
          恢复运行
        </Button>
      )
    }
  ];

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Space align="center" className="page-title-row">
        <Typography.Title level={3}>运行历史</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
          刷新
        </Button>
      </Space>
      {error ? <Alert type="error" message={error} showIcon /> : null}
      <Table
        rowKey="run_id"
        loading={loading}
        columns={columns}
        dataSource={runs}
        pagination={{ pageSize: 8 }}
        onRow={(record) => ({ onClick: () => setSelected(record) })}
        locale={{ emptyText: <Empty description="数据库中暂无历史运行" /> }}
      />
      {selected ? (
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Run ID">{selected.run_id}</Descriptions.Item>
          <Descriptions.Item label="Session ID">{selected.session_id}</Descriptions.Item>
          <Descriptions.Item label="Project revision">{selected.project_revision ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Artifacts">{selected.artifacts.length}</Descriptions.Item>
          <Descriptions.Item label="Completed steps" span={2}>
            <Space wrap>{selected.completed_steps.map((step) => <Tag key={step}>{step}</Tag>)}</Space>
          </Descriptions.Item>
        </Descriptions>
      ) : null}
    </Space>
  );
}
