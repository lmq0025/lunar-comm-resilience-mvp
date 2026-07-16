import { useEffect, useMemo, useState } from "react";
import {
  ApiOutlined,
  BarChartOutlined,
  CloudServerOutlined,
  CopyOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  ShareAltOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { Alert, App, Button, Layout, Menu, Space, Tag, Tooltip, Typography } from "antd";
import { SaveAsProjectModal } from "../components/SaveAsProjectModal";
import { HealingStrategyPage } from "../pages/HealingStrategyPage";
import { ProjectManagerPage } from "../pages/ProjectManagerPage";
import { RunHistoryPage } from "../pages/RunHistoryPage";
import { ServiceRoutingPage } from "../pages/ServiceRoutingPage";
import { SimulationRunPage } from "../pages/SimulationRunPage";
import { TopologyEditorPage } from "../pages/TopologyEditorPage";
import { connectionStatusLabel, useConnectionStore } from "../stores/connectionStore";
import { useProjectStore } from "../stores/projectStore";
import { type MainMenuKey, useUiStore } from "../stores/uiStore";
import { downloadText, stringifyProjectJson, stringifyScenarioYaml } from "../utils/importExport";

const { Header, Sider, Content, Footer } = Layout;

export function AppLayout() {
  const { message } = App.useApp();
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const activeMenu = useUiStore((state) => state.activeMenu);
  const setActiveMenu = useUiStore((state) => state.setActiveMenu);
  const collapsed = useUiStore((state) => state.collapsed);
  const setCollapsed = useUiStore((state) => state.setCollapsed);
  const draftProject = useProjectStore((state) => state.draftProject);
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const saveError = useProjectStore((state) => state.saveError);
  const saveRequestId = useProjectStore((state) => state.saveRequestId);
  const saveCurrent = useProjectStore((state) => state.saveCurrent);
  const retrySave = useProjectStore((state) => state.retrySave);
  const saveAs = useProjectStore((state) => state.saveAs);
  const connectionStatus = useConnectionStore((state) => state.status);
  const loadDiagnostics = useConnectionStore((state) => state.loadDiagnostics);

  const displayedSaveStatus = connectionStatus === "connected" ? saveStatus : draftProject ? "仅保存在本地草稿" : "未保存";
  const connectionColor = connectionStatus === "connected" ? "success" : connectionStatus === "checking" ? "processing" : "error";

  const handleSave = async () => {
    const saved = await saveCurrent();
    if (saved) message.success("项目已保存到数据库");
    else message.error(useProjectStore.getState().saveError ?? "项目保存失败");
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const saveAsInitial = useMemo(
    () => ({ name: `${draftProject?.name ?? "项目"} - 副本`, description: draftProject?.description ?? "" }),
    [draftProject]
  );

  const copyDiagnostics = async () => {
    try {
      const diagnostics = await loadDiagnostics();
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      message.success("诊断信息已复制");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "无法读取诊断信息");
    }
  };

  const exportYaml = () => {
    if (draftProject) downloadText(`${draftProject.name}.yaml`, stringifyScenarioYaml(draftProject.scenario), "application/x-yaml");
  };

  const exportProject = () => {
    if (draftProject) downloadText(`${draftProject.name}.lunar-project.json`, stringifyProjectJson(draftProject), "application/json");
  };

  return (
    <Layout className="app-shell">
      <Header className="top-bar">
        <Space className="top-left" size={12} wrap>
          <Typography.Title level={4} className="app-title">月面通信网络韧性仿真平台</Typography.Title>
          <Tag color="blue">{draftProject?.name ?? "未打开项目"}</Tag>
          <Tag color={displayedSaveStatus === "已保存到数据库" ? "success" : displayedSaveStatus === "保存中" ? "processing" : "warning"}>
            {displayedSaveStatus}
          </Tag>
        </Space>
        <Space wrap>
          <Tooltip title="保存项目">
            <Button aria-label="保存项目" icon={<SaveOutlined />} loading={saveStatus === "保存中"} disabled={!draftProject} onClick={() => void handleSave()} />
          </Tooltip>
          <Button onClick={() => setSaveAsOpen(true)} disabled={!draftProject}>另存为</Button>
          <Button icon={<UploadOutlined />} onClick={() => setActiveMenu("projects")}>导入</Button>
          <Button onClick={exportYaml} disabled={!draftProject}>导出 YAML</Button>
          <Button onClick={exportProject} disabled={!draftProject}>导出项目</Button>
          <Tag color={connectionColor}>{connectionStatusLabel[connectionStatus]}</Tag>
          <Tooltip title="复制诊断信息">
            <Button aria-label="复制诊断信息" icon={<CopyOutlined />} disabled={connectionStatus !== "connected"} onClick={() => void copyDiagnostics()} />
          </Tooltip>
        </Space>
      </Header>
      {saveError ? (
        <Alert
          banner
          type="error"
          message={saveError}
          description={saveRequestId ? `request_id: ${saveRequestId}` : undefined}
          action={<Button size="small" onClick={() => void retrySave()}>重试保存</Button>}
          closable
        />
      ) : null}
      <Layout>
        <Sider width={212} collapsible collapsed={collapsed} onCollapse={setCollapsed} className="side-nav">
          <Menu
            mode="inline"
            selectedKeys={[activeMenu]}
            onClick={({ key }) => setActiveMenu(key as MainMenuKey)}
            items={[
              { key: "projects", icon: <FolderOpenOutlined />, label: "项目管理" },
              { key: "topology", icon: <ShareAltOutlined />, label: "拓扑编辑" },
              { key: "services", icon: <ProjectOutlined />, label: "业务配置" },
              { key: "faults", icon: <CloudServerOutlined />, label: "故障计划" },
              { key: "healing", icon: <SafetyCertificateOutlined />, label: "自愈策略" },
              { key: "simulation", icon: <PlayCircleOutlined />, label: "仿真运行" },
              { key: "results", icon: <BarChartOutlined />, label: "结果分析" },
              { key: "runHistory", icon: <HistoryOutlined />, label: "运行历史" },
              { key: "experiments", icon: <ExperimentOutlined />, label: "批量实验", disabled: true }
            ]}
          />
        </Sider>
        <Content className="main-content">
          {activeMenu === "projects" ? <ProjectManagerPage />
            : activeMenu === "services" ? (
              <div className="page-stack"><Typography.Title level={4}>业务配置</Typography.Title><ServiceRoutingPage /></div>
            )
              : activeMenu === "healing" ? (
                <div className="page-stack"><Typography.Title level={4}>自愈策略</Typography.Title><HealingStrategyPage /></div>
              )
                : activeMenu === "runHistory" ? <RunHistoryPage />
                  : activeMenu === "faults" || activeMenu === "simulation" || activeMenu === "results" ? (
                    <div className="page-stack">
                      <Typography.Title level={4}>{activeMenu === "faults" ? "故障计划" : activeMenu === "results" ? "结果分析" : "仿真运行"}</Typography.Title>
                      <SimulationRunPage />
                    </div>
                  )
                    : <TopologyEditorPage />}
        </Content>
      </Layout>
      <Footer className="status-bar">
        <Space split={<span>/</span>} wrap>
          <span>Nodes {safeLength(draftProject?.scenario?.nodes)}</span>
          <span>Links {safeLength(draftProject?.scenario?.links)}</span>
          <span>Services {safeLength(draftProject?.scenario?.services)}</span>
          <span>Faults {safeLength(draftProject?.scenario?.faults?.schedule)}</span>
          <span>Healing {safeLength(draftProject?.scenario?.healing?.enabled)}</span>
          <span>Indicators {safeLength(draftProject?.scenario?.technical_indicators)}</span>
          <span><ApiOutlined /> {connectionStatusLabel[connectionStatus]}</span>
        </Space>
      </Footer>
      <SaveAsProjectModal
        open={saveAsOpen}
        initialValues={saveAsInitial}
        onCancel={() => setSaveAsOpen(false)}
        onSubmit={(values) => {
          void saveAs(values.name, values.description).then((saved) => {
            if (saved) {
              message.success("项目副本已保存到数据库");
              setSaveAsOpen(false);
            }
          });
        }}
      />
    </Layout>
  );
}

function safeLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}
