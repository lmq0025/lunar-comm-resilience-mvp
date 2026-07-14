import { useEffect, useMemo, useState } from "react";
import {
  ApiOutlined,
  BarChartOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
  FolderOpenOutlined,
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
import { ProjectManagerPage } from "../pages/ProjectManagerPage";
import { ServiceRoutingPage } from "../pages/ServiceRoutingPage";
import { SimulationRunPage } from "../pages/SimulationRunPage";
import { TopologyEditorPage } from "../pages/TopologyEditorPage";
import { useProjectStore } from "../stores/projectStore";
import { type MainMenuKey, useUiStore } from "../stores/uiStore";
import { downloadText, stringifyProjectJson, stringifyScenarioYaml } from "../utils/importExport";

const { Header, Sider, Content, Footer } = Layout;
const disabledMessage = "将在后续开发轮次开放";

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
        message.success("项目已保存");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [message, saveCurrent]);

  const backendStatus = isLoading ? "检查中" : isError ? "未连接" : "已连接";
  const backendColor = backendStatus === "已连接" ? "success" : backendStatus === "检查中" ? "processing" : "error";
  const saveAsInitial = useMemo(
    () => ({
      name: `${draftProject?.name ?? "项目"} - 另存`,
      description: draftProject?.description ?? ""
    }),
    [draftProject]
  );

  const exportYaml = () => {
    if (!draftProject) {
      message.warning("没有可导出的项目");
      return;
    }
    downloadText(`${draftProject.name}.yaml`, stringifyScenarioYaml(draftProject.scenario), "application/x-yaml");
  };

  const exportProject = () => {
    if (!draftProject) {
      message.warning("没有可导出的项目");
      return;
    }
    downloadText(`${draftProject.name}.lunar-project.json`, stringifyProjectJson(draftProject), "application/json");
  };

  return (
    <Layout className="app-shell">
      <Header className="top-bar">
        <Space className="top-left" size={16}>
          <Typography.Title level={4} className="app-title">
            月面通信网络韧性仿真平台
          </Typography.Title>
          <Tag color="blue">{draftProject?.name ?? "未打开项目"}</Tag>
          <Tag color={dirty ? "warning" : "success"}>{dirty ? "未保存" : "已保存"}</Tag>
        </Space>
        <Space>
          <Tooltip title="保存项目">
            <Button
              icon={<SaveOutlined />}
              onClick={() => {
                saveCurrent();
                message.success("项目已保存");
              }}
            />
          </Tooltip>
          <Button onClick={() => setSaveAsOpen(true)}>另存为</Button>
          <Button icon={<UploadOutlined />} onClick={() => setActiveMenu("projects")}>
            导入
          </Button>
          <Button onClick={exportYaml}>导出 YAML</Button>
          <Button onClick={exportProject}>导出项目 JSON</Button>
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
              { key: "projects", icon: <FolderOpenOutlined />, label: "项目管理" },
              { key: "topology", icon: <ShareAltOutlined />, label: "拓扑构建" },
              { key: "services", icon: <ProjectOutlined />, label: "业务配置" },
              { key: "faults", icon: <CloudServerOutlined />, label: "故障注入" },
              { key: "healing", icon: <SafetyCertificateOutlined />, label: "自愈策略", disabled: true, title: disabledMessage },
              { key: "simulation", icon: <PlayCircleOutlined />, label: "仿真运行" },
              { key: "results", icon: <BarChartOutlined />, label: "结果分析" },
              { key: "experiments", icon: <ExperimentOutlined />, label: "批量实验", disabled: true, title: disabledMessage }
            ]}
          />
        </Sider>
        <Content className="main-content">
          {activeMenu === "projects" ? (
            <ProjectManagerPage />
          ) : activeMenu === "services" ? (
            <ServiceRoutingPage />
          ) : activeMenu === "faults" || activeMenu === "simulation" || activeMenu === "results" ? (
            <SimulationRunPage />
          ) : (
            <TopologyEditorPage />
          )}
        </Content>
      </Layout>
      <Footer className="status-bar">
        <Space split={<span>/</span>}>
          <span>节点 {draftProject?.scenario.nodes.length ?? 0}</span>
          <span>链路 {draftProject?.scenario.links.length ?? 0}</span>
          <span>业务 {draftProject?.scenario.services.length ?? 0}</span>
          <span>故障 {draftProject?.scenario.faults.schedule.length ?? 0}</span>
          <span>自愈 {draftProject?.scenario.healing.enabled.length ?? 0}</span>
          <span>指标 {draftProject?.scenario.technical_indicators.length ?? 0}</span>
          <span>
            <ApiOutlined /> 后端 {backendStatus}
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
            message.success("已另存为新项目");
            setSaveAsOpen(false);
          }
        }}
      />
    </Layout>
  );
}
