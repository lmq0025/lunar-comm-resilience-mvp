import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { getApiBaseUrl } from "../src/api/client";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { AppLayout } from "../src/layouts/AppLayout";
import { TopologyEditorPage } from "../src/pages/TopologyEditorPage";
import { useConnectionStore } from "../src/stores/connectionStore";
import { useProjectStore } from "../src/stores/projectStore";
import { useTopologyEditorStore } from "../src/stores/topologyEditorStore";
import { useUiStore } from "../src/stores/uiStore";
import { defaultLikeScenario } from "./fixtures/scenarioFixture";

describe("Round 6.1 stability regressions", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useConnectionStore.setState({ status: "checking", retryCount: 0, lastError: null });
    useProjectStore.setState({
      projects: [], activeProjectId: null, draftProject: null, dirty: false,
      saveStatus: "未保存", saveError: null, saveRequestId: null, loadingProjects: false,
      validationStatus: "未验证", validationResult: null
    });
    useTopologyEditorStore.setState({ nodes: [], edges: [], warnings: [], selected: null, selectedNodeIds: [], selectedEdgeIds: [] });
    useUiStore.setState({ activeMenu: "projects", collapsed: false });
  });

  it("production frontend uses same-origin api", () => {
    expect(getApiBaseUrl()).toBe("/api/v1");
    expect(getApiBaseUrl()).not.toMatch(/localhost|127\.0\.0\.1|8000|5173/);
  });

  it("backend connection status recovers after a successful retry", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ok", application: "test", version: "0" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await useConnectionStore.getState().checkNow();
    expect(useConnectionStore.getState().status).toBe("disconnected");
    await useConnectionStore.getState().checkNow();
    expect(useConnectionStore.getState().status).toBe("connected");
    expect(useConnectionStore.getState().retryCount).toBe(0);
  });

  it("saved is not shown while backend is disconnected", () => {
    const project = localProject(defaultScenario12x20());
    useProjectStore.setState({ draftProject: project, activeProjectId: project.projectId, dirty: false, saveStatus: "已保存到数据库" });
    useConnectionStore.setState({ status: "disconnected" });
    renderWithProviders(<AppLayout />);
    expect(screen.queryByText("已保存到数据库")).not.toBeInTheDocument();
    expect(screen.getAllByText("仅保存在本地草稿").length).toBeGreaterThan(0);
    expect(screen.getAllByText("后端连接中断").length).toBeGreaterThan(0);
  });

  it("imported project remains dirty until backend save succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    useProjectStore.getState().importProject(localProject(defaultScenario12x20()));
    expect(useProjectStore.getState().dirty).toBe(true);
    expect(useProjectStore.getState().saveStatus).toBe("未保存");
    await useProjectStore.getState().saveCurrent();
    expect(useProjectStore.getState().dirty).toBe(true);
    expect(useProjectStore.getState().saveStatus).toBe("仅保存在本地草稿");
  });

  it("topology renders when backend is disconnected", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("offline"); }));
    const project = localProject(defaultScenario12x20());
    useProjectStore.setState({ draftProject: project, activeProjectId: project.projectId, dirty: true, saveStatus: "仅保存在本地草稿" });
    useConnectionStore.setState({ status: "disconnected" });
    renderWithProviders(<ErrorBoundary><TopologyEditorPage /></ErrorBoundary>);
    expect(await screen.findByText("当前显示本地草稿，部分后端功能暂不可用")).toBeInTheDocument();
    expect(screen.queryByText("界面发生错误")).not.toBeInTheDocument();
  });

  it("topology renders default scenario with 12 nodes and 20 links", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("catalog unavailable"); }));
    const project = localProject(defaultScenario12x20());
    useProjectStore.setState({ draftProject: project, activeProjectId: project.projectId, dirty: true });
    renderWithProviders(<ErrorBoundary><TopologyEditorPage /></ErrorBoundary>);
    await waitFor(() => {
      expect(useTopologyEditorStore.getState().nodes).toHaveLength(12);
      expect(useTopologyEditorStore.getState().edges).toHaveLength(20);
    });
    expect(screen.queryByText("界面发生错误")).not.toBeInTheDocument();
  });

  it("catalog failure does not crash topology", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("catalog failed", { status: 500 })));
    const project = localProject(defaultScenario12x20());
    useProjectStore.setState({ draftProject: project, activeProjectId: project.projectId, dirty: true });
    renderWithProviders(<ErrorBoundary><TopologyEditorPage /></ErrorBoundary>);
    await waitFor(() => expect(useTopologyEditorStore.getState().nodes).toHaveLength(12));
    expect(screen.queryByText("界面发生错误")).not.toBeInTheDocument();
  });

  it("error boundary can reset after navigation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ recorded: true, request_id: "client-error-1" }), { status: 200 })));
    useUiStore.setState({ activeMenu: "topology" });
    function FailsOnTopology() {
      if (useUiStore.getState().activeMenu === "topology") throw new Error("render failed");
      return <div>页面已恢复</div>;
    }
    renderWithProviders(<ErrorBoundary><FailsOnTopology /></ErrorBoundary>);
    expect(await screen.findByText("界面发生错误")).toBeInTheDocument();
    fireEvent.click(screen.getByText("返回项目管理"));
    expect(await screen.findByText("页面已恢复")).toBeInTheDocument();
  });
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ConfigProvider locale={zhCN}>
      <AntdApp><QueryClientProvider client={queryClient}>{ui}</QueryClientProvider></AntdApp>
    </ConfigProvider>
  );
}

function localProject(scenario: ReturnType<typeof defaultScenario12x20>) {
  const now = new Date().toISOString();
  return {
    schemaVersion: "1.0" as const,
    projectId: "local-draft",
    name: "默认场景",
    description: "",
    createdAt: now,
    updatedAt: now,
    scenario,
    editor: {}
  };
}

function defaultScenario12x20() {
  const base = defaultLikeScenario();
  const nodes = Array.from({ length: 12 }, (_, index) => ({
    ...base.nodes[0],
    id: `node_${index + 1}`,
    name: `Node ${index + 1}`,
    type: index === 0 ? "main_hub" : "surface_relay"
  }));
  const links = Array.from({ length: 20 }, (_, index) => ({
    ...base.links[0],
    id: `link_${index + 1}`,
    source: nodes[index % nodes.length].id,
    target: nodes[(index + 1 + Math.floor(index / nodes.length)) % nodes.length].id
  }));
  return { ...base, nodes, links };
}
