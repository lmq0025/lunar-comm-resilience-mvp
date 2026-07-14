# 完整软件第 1 轮后端 API 说明

## 本轮目标

本轮在现有月面通信网络 MVP 仿真内核上，将一次性 `run_simulation()` 闭环拆分为可交互调用的九个仿真步骤，并提供 FastAPI 后端接口。现有 CLI、Streamlit Dashboard、实验模块、YAML 配置和输出文件格式保持兼容。

## 整体架构

后端分为三层：

- `lunar_comm_sim.core`：保留拓扑、路由、故障、自愈、业务、指标、传播和报告等核心算法。
- `lunar_comm_sim.sim.staged_engine`：新增九步状态机，保存每个会话的中间图、业务结果、指标、故障记录、自愈动作和传播结果。
- `lunar_comm_sim.api`：新增 FastAPI 层，负责场景校验、会话管理、接口调度、快照序列化和严格 JSON 输出。

`run_simulation()` 已改为调用同一套分步引擎顺序执行九步，因此完整运行和 API 分步运行共享底层逻辑。

## 九步状态机

状态顺序为：

`created -> topology_built -> nominal_routes_calculated -> nominal_simulated -> faults_injected -> fault_impact_analyzed -> healing_executed -> healed_routes_calculated -> after_healing_simulated -> indicators_verified`

如果步骤顺序错误，API 返回 HTTP 409，并给出 `INVALID_STEP_ORDER`、当前状态和所需状态。

## 每一步调用的现有算法

1. 构建拓扑：调用 `build_topology(scenario)`，生成 `nominal_graph`，不计算路径。
2. 计算路径：调用 `build_routing_table(..., recompute=True, route_source="nominal_computed")`。
3. 运行正常状态：调用 `validate_physical_models()`、`simulate_services(..., phase="nominal")`、`calculate_metrics(..., phase="nominal")`。
4. 注入故障：调用 `apply_faults()`，再用 `recompute=False` 继承并验证正常路径，不自动重路由。
5. 分析故障影响：调用故障后业务仿真、指标计算、传播预测、观测影响提取、预测对比和传播指标计算。
6. 执行自愈：调用 `initialize_healing_state()` 和 `apply_non_routing_healing()`，只执行优先级调度、服务降级、存储转发、预切换等非路由动作。
7. 重新计算路径：调用 `apply_reroute_healing()`；只有启用 `reroute_backup_path` 时才重新路由，否则只重新验证当前继承路径。
8. 运行自愈后状态：调用 `simulate_services(..., phase="after_healing")` 和 `calculate_metrics(..., phase="after_healing")`，带入传播指标和物理模型指标。
9. 验证指标：调用 `build_indicator_checks()`，写出 CSV、PNG 和 Markdown 结果文件。

## API 启动方法

```powershell
scripts\run_api.bat
```

等价命令：

```powershell
python -m uvicorn lunar_comm_sim.api.main:app --host 127.0.0.1 --port 8000
```

启动后访问：

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`
- `http://127.0.0.1:8000/api/v1/health`

## Swagger 测试方法

1. 打开 `/docs`。
2. 调用 `POST /api/v1/scenarios/validate`，提交默认场景 JSON，确认 `valid=true`。
3. 调用 `POST /api/v1/sessions` 创建会话，记录 `session_id`。
4. 按顺序调用九个 `/steps/...` 接口。
5. 调用 `/snapshots/{stage}` 查看 `nominal`、`before_healing`、`after_healing` 快照。
6. 调用 `/artifacts` 查看输出文件清单。

## 九个接口调用顺序

- `POST /api/v1/sessions/{session_id}/steps/build-topology`
- `POST /api/v1/sessions/{session_id}/steps/calculate-routes`
- `POST /api/v1/sessions/{session_id}/steps/run-nominal`
- `POST /api/v1/sessions/{session_id}/steps/inject-faults`
- `POST /api/v1/sessions/{session_id}/steps/analyze-fault-impact`
- `POST /api/v1/sessions/{session_id}/steps/execute-healing`
- `POST /api/v1/sessions/{session_id}/steps/recalculate-routes`
- `POST /api/v1/sessions/{session_id}/steps/run-after-healing`
- `POST /api/v1/sessions/{session_id}/steps/verify-indicators`

## 默认场景理想结果

- 节点数：12
- 链路数：20
- 正常业务路径：4 条且全部有效
- 故障记录：4 条
- 主枢纽故障后：4 条继承路径全部无效，且不会提前切到备用中继
- 第 6 步：非路由自愈动作已执行，`pending_route_recalculation=true`
- 第 7 步：4 条业务路径重新有效，路径使用备用中继
- 技术指标：14 项适用，14 项通过

## 会话限制

本轮会话只保存在 FastAPI 进程内存中。服务重启后，会话状态会丢失。已生成的输出目录不会自动删除。本轮没有使用数据库，也没有用 pickle 保存 NetworkX 图。

## 本轮未实现内容

- React 图形界面
- React Flow 拓扑画布
- Tauri 桌面封装
- SQLite / SQLModel
- Celery / Redis
- 用户登录和远程多用户
- 真正连续时间动态仿真
- 项目保存、打开和复制
- Windows 安装包
