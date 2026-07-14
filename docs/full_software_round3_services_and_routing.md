# Full Software Round 3: Services and Routing

## 本轮目标

第 3 轮在第 2.1 轮前端和第 1.1 轮后端基础上，开放九步流程中的前两步：

1. 构建拓扑
2. 计算路径

本轮不实现正常业务仿真、故障注入、自愈执行、重路由仿真或指标验证页面。

## 业务数据模型

后端 `ServiceConfig` 保持旧 YAML 兼容，并新增可选字段：

- `name`
- `service_type`

同时保留并校验：

- `id`
- `source`
- `target`
- `priority`
- `required_bandwidth_mbps`
- `max_delay_ms`
- `max_loss_rate`
- `max_interruption_s`
- `min_success_rate`
- `degraded_bandwidth_mbps`

API `ServicePayload` 显式声明完整 QoS 字段。若设置 `degraded_bandwidth_mbps`，必须小于或等于 `required_bandwidth_mbps`。

## 业务类型预设

前端提供 5 类业务预设，均标注为“默认建议值，可编辑”：

- 控制指令：`control_command`
- 遥操作：`teleoperation`
- 科学数据：`science_data`
- 高清影像：`hd_video`
- 自定义业务：`custom`

预设只填充初始建议值，用户仍可修改带宽、时延、丢包率和其他 QoS 约束。

## 业务编辑流程

业务配置页面支持：

- 新增业务
- 编辑业务
- 复制业务
- 删除业务
- 选择源节点和目标节点
- 配置带宽和 QoS 约束
- 保存业务配置到当前项目 `scenario.services`

业务 ID 创建后只读。复制和新增使用 `service_<短 UUID>`，不会因删除业务而复用旧 ID。

## 后端 Session 生命周期

路径计算 session 仅存在于运行时内存：

- 不写入 `localStorage` 项目文档
- 不写入导出 YAML
- 不写入项目 JSON 的 `scenario`
- 刷新页面后允许丢失

当项目、拓扑、链路或业务发生修改时，已有拓扑和路径结果标记为“已过期”。旧 session 会在重新构建拓扑时 best-effort 删除。

## 步骤 1：构建拓扑

前端执行顺序：

1. 读取当前 `ScenarioPayload`
2. 调用 `/api/v1/scenarios/validate`
3. 验证失败则停止
4. best-effort 删除旧 session
5. `POST /api/v1/sessions`
6. `POST /api/v1/sessions/{id}/steps/build-topology`
7. 保存运行时 `sessionId`
8. 保存后端拓扑 snapshot

成功后显示节点总数、链路总数、活动节点数、活动链路数和 session 简短 ID。

## 步骤 2：计算路径

只有步骤 1 成功后，前端才允许调用：

```http
POST /api/v1/sessions/{session_id}/steps/calculate-routes
```

后端一次计算全部业务路径。前端保存运行时 `routes` 和最新 topology snapshot。

## 路径可视化规则

路径页面使用只读 React Flow：

- 节点位置沿用项目当前坐标
- 选中业务后高亮路径节点和链路
- 非路径元素降低透明度
- 源节点显示“源”
- 目标节点显示“目标”
- 无效路径不高亮任何链路

链路按无向边匹配，支持 `A-B` 和 `B-A` 两种存储方向，不依赖边 ID 字符串顺序。

## 路径指标定义

路径指标直接显示后端返回字段：

- `bottleneck_bandwidth_mbps`
- `total_delay_ms`
- `packet_loss_rate`
- `availability`
- `handover_disturbance_ms`

前端只做格式化显示，不重新计算或覆盖后端结果。

## QoS 路径级预检查

路径级预检查只比较当前静态路径指标，不等同于第 3 步业务仿真最终结论。

检查项包括：

- 瓶颈带宽是否满足需求带宽
- 总时延是否满足最大时延
- 路径丢包率是否满足最大丢包率
- `1 - packet_loss_rate` 的链路级成功率近似是否满足最小成功率

最大中断时间显示“需在后续故障/业务仿真中验证”。降级带宽显示为自愈或降级策略备用参数，不作为当前正常路径硬性通过条件。

## 结果过期规则

以下变更会使后端拓扑、路径结果和 session 过期：

- 新增、删除、修改节点
- 新增、删除、修改链路
- 新增、删除、修改业务
- 导入新项目
- 切换项目

过期后用户必须重新执行“① 构建拓扑”和“② 计算路径”。

## 自定义端口启动

后端：

```bat
set LUNAR_API_PORT=8765
scripts\run_api.bat
```

前端：

```bat
set LUNAR_FRONTEND_PORT=5174
set VITE_API_BASE_URL=http://127.0.0.1:8765/api/v1
scripts\run_frontend.bat
```

平台脚本：

```bat
scripts\run_platform_dev.bat 8765 5174
```

## 测试方法

后端：

```powershell
python -m pytest -q -ra -p no:cacheprovider
python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/round3_cli_regression
```

前端：

```powershell
cd frontend
npm.cmd ci
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test
npm.cmd run build
npm.cmd audit --omit=dev
```

## 人工验收流程

1. 导入 `configs/default_scenario.yaml`
2. 打开业务配置，确认 4 项业务显示
3. 新增自定义业务并保存
4. 点击“① 构建拓扑”
5. 点击“② 计算路径”
6. 依次选择默认业务并检查路径高亮和指标
7. 修改链路时延或业务目标，确认结果已过期
8. 使用 `scripts\run_platform_dev.bat 8765 5174` 验证自定义端口

## 已知限制

- 本轮不执行第 3 步业务仿真。
- 路径级 QoS 预检查不是最终业务成功率结论。
- session 和路径结果只保存在前端运行时内存。
- 生产构建仍可能出现 Vite 大 chunk 警告。
