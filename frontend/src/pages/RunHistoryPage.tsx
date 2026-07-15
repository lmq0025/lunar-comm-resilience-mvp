import { useCallback, useEffect, useState } from "react";
import { ReloadOutlined, RollbackOutlined } from "@ant-design/icons";
import { Alert, App, Button, Descriptions, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { listRuns, restoreRunSession } from "../api/runs";
import type { SimulationRunResponse } from "../api/contracts";
import { useProjectStore } from "../stores/projectStore";
import { useServiceRoutingStore } from "../stores/serviceRoutingStore";
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
      useServiceRoutingStore.setState({
        sessionId: response.session.session_id,
        runtimeProjectId: response.session.project_id ?? null
      });
      message.success("Run session restored");
      setActiveMenu("simulation");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<SimulationRunResponse> = [
    { title: "Run", dataIndex: "run_id", ellipsis: true },
    { title: "Scenario", dataIndex: "scenario_name", ellipsis: true },
    { title: "Status", dataIndex: "status", render: (value) => <Tag color={value === "completed" ? "success" : "processing"}>{value}</Tag> },
    { title: "Current step", dataIndex: "current_step" },
    { title: "Steps", render: (_, run) => `${run.completed_steps.length}/9` },
    { title: "Updated", dataIndex: "updated_at", render: (value) => new Date(value).toLocaleString() },
    {
      title: "Action",
      render: (_, run) => (
        <Button size="small" icon={<RollbackOutlined />} onClick={() => restore(run)}>
          Restore
        </Button>
      )
    }
  ];

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Space align="center" className="page-title-row">
        <Typography.Title level={3}>Run history</Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
          Refresh
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
        locale={{ emptyText: <Empty description="No persisted runs" /> }}
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
