# 月面通信网络韧性仿真平台前端

本目录是 React + TypeScript + Vite 前端。界面默认中文，使用 Ant Design、React Flow、Zustand、TanStack Query 和 YAML。

## 启动

```bat
..\scripts\install_frontend.bat
..\scripts\run_frontend.bat
```

默认前端地址：

```text
http://127.0.0.1:5173
```

默认 API 地址：

```text
http://127.0.0.1:8000/api/v1
```

可通过环境变量配置：

```bat
set LUNAR_FRONTEND_PORT=5174
set VITE_API_BASE_URL=http://127.0.0.1:8765/api/v1
..\scripts\run_frontend.bat
```

也可以在项目根目录运行：

```bat
scripts\run_platform_dev.bat 8765 5174
```

## 脚本

```bat
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## 当前范围

前端支持：

- 项目管理
- YAML/JSON 导入导出
- 拓扑构建和节点/链路编辑
- 框选、多选和批量删除
- 撤销/重做、自动布局、视口保存
- 场景验证
- 业务配置 CRUD
- 后端步骤 ① 构建拓扑
- 后端步骤 ② 计算路径
- 路径高亮、路径指标显示、QoS 路径级预检查
- 故障计划 CRUD、启用/停用和时间轴显示
- 后端步骤 ③ 运行正常状态
- 后端步骤 ④ 注入故障
- 后端步骤 ⑤ 分析故障影响
- 正常业务结果、故障记录、继承路径、指标差值和故障传播结果展示

仍未开放：

- 步骤 ⑥ 执行自愈
- 步骤 ⑦ 重新计算路径
- 步骤 ⑧ 运行自愈后状态
- 步骤 ⑨ 验证指标
- 批量实验页面

## 阶段快照模式

当前仿真运行页是阶段快照模式，不是连续时间事件播放器。故障时间轴用于配置 `start_s` 和 `duration_s`；点击“注入故障”时，后端会把所有启用故障应用到“故障后、自愈前”快照。

## 本地存储说明

项目暂存在浏览器 `localStorage`：

- `lunar_comm_projects_v1`
- `lunar_comm_active_project_v1`

路径计算 session、拓扑 snapshot、路由结果、正常仿真结果、故障注入结果和故障影响结果只存在运行时内存，不写入项目 JSON 或导出 YAML。刷新页面后允许丢失。
