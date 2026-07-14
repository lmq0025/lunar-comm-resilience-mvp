# 完整软件第 2 轮前端开发说明

## 本轮目标

第 2 轮在第 1.1 轮 FastAPI 后端基础上新增浏览器端中文软件外壳，支持本地项目管理、场景导入导出、可视化拓扑构建、节点与链路属性编辑，以及调用后端 `POST /api/v1/scenarios/validate` 进行场景验证。

## 前端技术栈

- React + TypeScript + Vite
- Ant Design 与 `@ant-design/icons`
- `@xyflow/react` 作为拓扑画布
- Zustand 管理项目、拓扑编辑器和 UI 状态
- TanStack Query 管理 health、catalogs、scenario validation 请求
- `yaml` 处理 YAML 导入导出
- `dagre` 执行自动布局
- Vitest、React Testing Library、jsdom 用于自动化测试

## 目录结构

```text
frontend/
  src/api/              统一 API 客户端、请求 hooks、OpenAPI 对齐类型
  src/features/projects 后续项目功能扩展位
  src/features/topology 节点库、属性面板、验证面板
  src/features/services 第 3 轮业务配置预留目录
  src/features/routing  第 3 轮路由计算预留目录
  src/layouts/          软件外壳
  src/pages/            项目管理页和拓扑编辑页
  src/stores/           projectStore、topologyEditorStore、uiStore
  src/types/            项目文档和拓扑类型
  src/utils/            导入导出、转换、布局、存储工具
  tests/                Vitest 测试
```

## 页面结构

软件外壳包含顶部栏、左侧导航、主工作区、右侧属性面板和底部状态栏。当前启用“项目管理”和“拓扑构建”，业务配置、故障注入、自愈策略、仿真运行、结果分析和批量实验显示为禁用并提示“将在后续开发轮次开放”。

## 项目文档格式

```ts
interface LunarProjectDocument {
  schemaVersion: "1.0";
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  scenario: ScenarioPayload;
  editor: {
    viewport?: { x: number; y: number; zoom: number };
  };
}
```

`ProjectDocument` 保存项目元数据和编辑器状态；`ScenarioPayload` 只保存后端仿真所需场景。导出 YAML 时只导出 `scenario`，导出项目 JSON 时导出完整项目文档。

## localStorage 存储方式

当前为本地浏览器项目存储：

- `lunar_comm_projects_v1`
- `lunar_comm_active_project_v1`

清除浏览器数据会清除未导出的本地项目；后续桌面版将迁移到后端项目目录和 SQLite。

## 拓扑编辑器数据流

导入或打开项目后，`projectStore` 将当前 `ScenarioPayload` 交给 `topologyEditorStore`。拓扑编辑器维护 React Flow 节点、链路、选中对象和历史记录。用户修改拓扑后，编辑器通过转换层生成新的 `ScenarioPayload` 并更新项目草稿，项目进入未保存状态。只有显式保存或 `Ctrl+S` 才写入 localStorage。

## React Flow 与 ScenarioPayload 转换关系

转换函数集中在 `src/utils/topologyTransforms.ts`：

- `scenarioNodeToFlowNode()`
- `flowNodeToScenarioNode()`
- `scenarioLinkToFlowEdge()`
- `flowEdgeToScenarioLink()`
- `projectToEditorState()`
- `editorStateToScenario()`

React Flow 专用字段如 `position`、`selected`、`data` 不直接写入后端场景顶层。保存和验证前统一转换为后端字段，例如 `position_x`、`position_y`、`links`。

## 导入导出规则

- 导入 `.yaml/.yml`：解析为 `ScenarioPayload`，再包装为新的 `ProjectDocument`
- 导入 `.json`：按 `ProjectDocument` 解析，要求 `schemaVersion` 为 `"1.0"`
- 导出 YAML：只导出当前项目的 `scenario`
- 导出项目 JSON：导出完整 `ProjectDocument`

导入默认场景后必须保留节点、链路、业务、故障、自愈和指标区段。

## 场景验证流程

用户点击“验证当前场景”后，前端通过统一 API 客户端调用：

```text
POST /api/v1/scenarios/validate
```

请求体为当前完整 `ScenarioPayload`。验证面板展示 `valid`、summary、errors 和 warnings。拓扑一旦继续修改，原验证状态会变为“验证结果已过期”。

## 启动方法

安装前端依赖：

```bat
scripts\install_frontend.bat
```

同时启动后端和前端：

```bat
scripts\run_platform_dev.bat
```

访问：

```text
http://127.0.0.1:5173
```

## 测试方法

```bat
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

后端回归：

```bat
python -m pytest -q -ra -p no:cacheprovider
python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/round2_cli_regression
```

## 人工验收流程

1. 新建项目：进入空白画布，项目名正确，状态为未保存。
2. 手工建图：拖入节点、连接链路、编辑链路参数、保存、刷新后重新打开。
3. 默认场景导入：导入 `configs/default_scenario.yaml` 后显示 12 个节点和 20 条链路，并自动形成可读布局。
4. 拓扑编辑：移动节点、修改链路带宽、复制和删除节点、撤销重做。
5. 验证：调用后端验证，显示 summary、errors 和 warnings。
6. 导出再导入：导出 YAML 后重新导入，节点、链路和业务/故障/自愈/指标区段不丢失。

## 已知限制

- 项目暂存于浏览器 localStorage。
- 尚未实现后端持久化。
- 尚未实现业务和路由页面。
- 尚未实现故障与自愈页面。
- 尚未实现九步运行按钮。
- 尚未封装桌面 EXE。

## 下一轮接口预留

第 3 轮将开发业务配置、源/目标节点选择、QoS 参数配置、点击计算路径、路径高亮和路径指标展示。本轮已预留 `features/services/`、`features/routing/` 目录，并提供 `getCurrentScenario()` 选择器供后续直接创建仿真会话和调用步骤接口。
