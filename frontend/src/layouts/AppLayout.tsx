import { useEffect, useMemo, useState } from "react";
import {
  ApiOutlined,
  BarChartOutlined,
  CloudServerOutlined,
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
import { App, Button, Layout, Menu, Space, Tag, Tooltip, Typography } from "antd";
import { useHealthQuery } from "../api/health";
import { SaveAsProjectModal } from "../components/SaveAsProjectModal";
import { HealingStrategyPage } from "../pages/HealingStrategyPage";
import { ProjectManagerPage } from "../pages/ProjectManagerPage";
import { RunHistoryPage } from "../pages/RunHistoryPage";
import { ServiceRoutingPage } from "../pages/ServiceRoutingPage";
import { SimulationRunPage } from "../pages/SimulationRunPage";
import { TopologyEditorPage } from "../pages/TopologyEditorPage";
import { useProjectStore } from "../stores/projectStore";
import { type MainMenuKey, useUiStore } from "../stores/uiStore";
import { downloadText, stringifyProjectJson, stringifyScenarioYaml } from "../utils/importExport";

const { Header, Sider, Content, Footer } = Layout;
const disabledMessage = "Available in a later round";

export function AppLayout() {
  const { message } = App.useApp();
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const activeMenu = useUiStore((state) => state.activeMenu);
  const setActiveMenu = useUiStore((state) => state.setActiveMenu);
  const collapsed = useUiStore((state) => state.collapsed);
  const setCollapsed = useUiStore((state) => state.setCollapsed);
  const draftProject = useProjectStore((state) => state.draftProject);
  const dirty = useProjectStore((state) => state.dirty);
  const saveCurrent = useProjectStore((state) => state.saveCurrent);
  const saveAs = useProjectStore((state) => state.saveAs);
  const { data: health, isLoading, isError } = useHealthQuery();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveCurrent();
        message.success("Project saved");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [message, saveCurrent]);

  const backendStatus = isLoading ? "Checking" : isError ? "Disconnected" : "Connected";
  const backendColor = backendStatus === "Connected" ? "success" : backendStatus === "Checking" ? "processing" : "error";
  const saveAsInitial = useMemo(
    () => ({
      name: `${draftProject?.name ?? "Project"} - Copy`,
      description: draftProject?.description ?? ""
    }),
    [draftProject]
  );

  const exportYaml = () => {
    if (!draftProject) {
      message.warning("No project to export");
      return;
    }
    downloadText(`${draftProject.name}.yaml`, stringifyScenarioYaml(draftProject.scenario), "application/x-yaml");
  };

  const exportProject = () => {
    if (!draftProject) {
      message.warning("No project to export");
      return;
    }
    downloadText(`${draftProject.name}.lunar-project.json`, stringifyProjectJson(draftProject), "application/json");
  };

  return (
    <Layout className="app-shell">
      <Header className="top-bar">
        <Space className="top-left" size={16}>
          <Typography.Title level={4} className="app-title">
            Lunar Communication Resilience Platform
          </Typography.Title>
          <Tag color="blue">{draftProject?.name ?? "No project opened"}</Tag>
          <Tag color={dirty ? "warning" : "success"}>{dirty ? "Unsaved" : "Saved"}</Tag>
        </Space>
        <Space>
          <Tooltip title="Save project">
            <Button
              icon={<SaveOutlined />}
              onClick={() => {
                saveCurrent();
                message.success("Project saved");
              }}
            />
          </Tooltip>
          <Button onClick={() => setSaveAsOpen(true)}>Save as</Button>
          <Button icon={<UploadOutlined />} onClick={() => setActiveMenu("projects")}>
            Import
          </Button>
          <Button onClick={exportYaml}>Export YAML</Button>
          <Button onClick={exportProject}>Export project JSON</Button>
          <Tag color={backendColor}>{backendStatus}</Tag>
          {health ? <Tag>{health.version}</Tag> : null}
        </Space>
      </Header>
      <Layout>
        <Sider width={212} collapsible collapsed={collapsed} onCollapse={setCollapsed} className="side-nav">
          <Menu
            mode="inline"
            selectedKeys={[activeMenu]}
            onClick={({ key }) => setActiveMenu(key as MainMenuKey)}
            items={[
              { key: "projects", icon: <FolderOpenOutlined />, label: "Projects" },
              { key: "topology", icon: <ShareAltOutlined />, label: "Topology" },
              { key: "services", icon: <ProjectOutlined />, label: "Services" },
              { key: "faults", icon: <CloudServerOutlined />, label: "Faults" },
              { key: "healing", icon: <SafetyCertificateOutlined />, label: "Healing" },
              { key: "simulation", icon: <PlayCircleOutlined />, label: "Simulation" },
              { key: "results", icon: <BarChartOutlined />, label: "Results" },
              { key: "runHistory", icon: <HistoryOutlined />, label: "Run history" },
              { key: "experiments", icon: <ExperimentOutlined />, label: "Experiments", disabled: true, title: disabledMessage }
            ]}
          />
        </Sider>
        <Content className="main-content">
          {activeMenu === "projects" ? (
            <ProjectManagerPage />
          ) : activeMenu === "services" ? (
            <ServiceRoutingPage />
          ) : activeMenu === "healing" ? (
            <HealingStrategyPage />
          ) : activeMenu === "runHistory" ? (
            <RunHistoryPage />
          ) : activeMenu === "faults" || activeMenu === "simulation" || activeMenu === "results" ? (
            <SimulationRunPage />
          ) : (
            <TopologyEditorPage />
          )}
        </Content>
      </Layout>
      <Footer className="status-bar">
        <Space split={<span>/</span>}>
          <span>Nodes {draftProject?.scenario.nodes.length ?? 0}</span>
          <span>Links {draftProject?.scenario.links.length ?? 0}</span>
          <span>Services {draftProject?.scenario.services.length ?? 0}</span>
          <span>Faults {draftProject?.scenario.faults.schedule.length ?? 0}</span>
          <span>Healing {draftProject?.scenario.healing.enabled.length ?? 0}</span>
          <span>Indicators {draftProject?.scenario.technical_indicators.length ?? 0}</span>
          <span>
            <ApiOutlined /> Backend {backendStatus}
          </span>
        </Space>
      </Footer>
      <SaveAsProjectModal
        open={saveAsOpen}
        initialValues={saveAsInitial}
        onCancel={() => setSaveAsOpen(false)}
        onSubmit={(values) => {
          const saved = saveAs(values.name, values.description);
          if (saved) {
            message.success("Project copied");
            setSaveAsOpen(false);
          }
        }}
      />
    </Layout>
  );
}
