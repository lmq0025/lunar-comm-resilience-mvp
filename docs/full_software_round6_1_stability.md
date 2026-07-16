# 第 6.1 轮稳定性与真实可用性修复

本轮只修复本地单用户演示版的启动、连接、保存、拓扑渲染和恢复稳定性，没有修改九步顺序、默认场景、仿真算法、指标阈值或输出文件名。

## 生产运行模型

- React 生产包与 FastAPI 使用同一来源，前端唯一 API 基址为 `/api/v1`。
- Vite 开发服务器将 `/api/v1` 代理到 `127.0.0.1:8000`，页面代码不维护开发/生产两套地址。
- `scripts/run_local_app.bat` 自动定位 Conda Python、初始化 SQLite、探测空闲端口，并委托 Python 启动器等待健康检查后打开浏览器。
- 默认数据目录为项目同级的 `local_app_data`，可通过 `LUNAR_APP_DATA_DIR` 覆盖。

## 数据权威性

- SQLite 是正式项目、项目版本、运行步骤和成果清单的权威来源。
- `localStorage` 只保存一个未同步草稿、最后项目 ID 和编辑器界面状态。
- 项目 API 返回 `project_id`、`revision` 和 `updated_at` 后，前端才显示“已保存到数据库”并清除 dirty。
- API 仿真成果写入 `%LUNAR_APP_DATA_DIR%\runs\<run_id>\`；CLI 的 `--out` 行为保持不变。

## 恢复

- 刷新页面时，前端读取当前正式项目、最近运行及其 `run_steps`，恢复九步状态与所有阶段结果。
- 后端进程重启后，`restore-session` 按已持久化步骤重建会话，前端将每一步响应重新映射到运行 Store。
- Catalog 加载失败有独立错误状态，不阻止本地草稿的 Topology 渲染。

## 验证入口

```powershell
scripts\run_local_app.bat
python scripts\smoke_local_app.py --base-url http://127.0.0.1:<实际端口>
```

结构化诊断接口：`GET /api/v1/diagnostics`。

故障前后证据、启动截图和 Playwright 截图位于 `outputs/round6_1_evidence/`。
