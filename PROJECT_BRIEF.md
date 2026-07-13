# 月面通信网络韧性评价与自愈仿真软件 MVP 开发任务书

## 1. 项目目标

本项目要开发一个 Python 自研仿真软件的最小可运行系统，用于跑通“月面通信网络可用性评价与自愈研究”的最小闭环流程。

本项目不是开发真实 5G/WiFi 通信协议栈，也不是做高保真电磁仿真，而是开发一个轻量级、可扩展、可验证指标的仿真评价软件。

最小闭环必须实现：

1. 建立月面通信网络拓扑；
2. 设置月面节点、主节点、备用中继节点、月轨中继和地面站；
3. 设置控制指令、科学数据、高清图像、实时遥操作等业务流；
4. 为每条链路设置带宽、时延、丢包率、可用率等参数；
5. 注入月尘、辐射、温差、主节点失效、中继切换、拥塞等故障；
6. 计算物理层、网络层、业务层可用性指标；
7. 启动自愈策略，包括重路由、资源调度、业务降级、缓存转发和中继预切换；
8. 对比自愈前后指标；
9. 输出指标是否满足技术要求的结果表、图和报告。

## 2. 开发语言与技术栈

使用 Python 3.11。

推荐依赖：

- numpy
- pandas
- networkx
- simpy
- pydantic
- pyyaml
- matplotlib
- plotly
- streamlit
- typer
- rich
- pytest

第一阶段只要求实现命令行运行和基础 Streamlit 展示，不要求完整 PyQt 桌面软件。

## 3. 最小场景设计

默认场景包含 12 个节点：

1. lander_main_hub：着陆器主通信节点，主节点；
2. relay_backup_1：备用月面中继节点 1；
3. relay_backup_2：备用月面中继节点 2；
4. rover_1：巡视器 1；
5. rover_2：巡视器 2；
6. rover_3：巡视器 3；
7. edge_compute：月面边缘计算节点；
8. science_station：科学数据采集节点；
9. camera_station：高清图像采集节点；
10. teleop_terminal：实时遥操作终端；
11. lunar_orbiter：月轨中继卫星；
12. ground_station：地面站。

默认网络包含：

- 月面 5G/WiFi 局域链路；
- 月面节点到月轨中继链路；
- 月轨中继到地面站链路；
- 主节点到备用中继节点的冗余链路。

## 4. 业务流设计

至少实现 4 类业务：

### 4.1 control_command

控制指令业务。

要求：

- 最高优先级；
- 低时延；
- 低丢包；
- 对应技术指标：URLLC 指令丢包率 ≤ 1e-5。

### 4.2 science_data

科学数据回传业务。

要求：

- 中等带宽；
- 支持缓存转发和断点续传；
- 对应技术指标：主节点失效场景下科学数据回传中断 ≤ 1 s。

### 4.3 hd_video

高清影像回传业务。

要求：

- 高带宽；
- 可以在拥塞时降码率；
- 对应技术指标：高清影像回传成功率 ≥ 99.9%。

### 4.4 teleoperation

实时遥操作业务。

要求：

- 高优先级；
- 低时延和低抖动；
- 故障后优先保障。

## 5. 环境影响因素模型

采用参数化模型，不做复杂物理仿真。

至少实现以下环境因素：

### 5.1 月尘 dust

输入参数：

- dust_level，范围 0~1。

影响：

- 降低天线增益；
- 增大链路丢包率；
- 降低链路可用率。

基本模型：

delta_gain_db = k_dust * dust_level

其中 k_dust 可以默认取 3 dB。

### 5.2 温度 temperature

输入参数：

- temperature_c，单位 ℃。

影响：

- 当温度超出正常范围时，降低 RF 健康度；
- 增加链路误码率或丢包率；
- 用于 RF 寿命修正模型。

### 5.3 辐射 radiation

输入参数：

- radiation_level，范围 0~1。

影响：

- 增加节点 CPU 异常概率；
- 增加节点处理延迟；
- 可能触发 CPU lock 或 single event upset 故障。

### 5.4 地形遮挡 obstruction

输入参数：

- obstruction_probability；
- obstruction_duration_s。

影响：

- 使部分链路临时不可用；
- 触发重路由。

### 5.5 月轨中继切换 relay_handover

输入参数：

- handover_start_s；
- handover_duration_s；
- handover_extra_delay_ms。

影响：

- 增加月面到地面站链路的端到端时延；
- 若启用预切换和缓存策略，则时延扰动应控制在 50 ms 以内。

## 6. 故障模式库

至少实现 10 类故障模式，并保存在配置文件或代码枚举中：

F1 radiation_cpu_lock：辐射导致 CPU 锁频；
F2 single_event_upset：单粒子翻转；
F3 dust_antenna_degradation：月尘附着导致天线增益衰减；
F4 thermal_rf_drift：极端温差导致射频漂移；
F5 terrain_obstruction：月面地形遮挡；
F6 main_hub_failure：主节点失效；
F7 relay_handover_delay：月轨中继切换异常；
F8 buffer_overflow：多业务缓存溢出；
F9 route_oscillation：路由震荡；
F10 power_limited_mode：能源受限降功率。

## 7. 自愈策略

至少实现 5 类自愈策略：

### 7.1 reroute_backup_path

当主节点、链路或中继失效时，重新计算备用路径。

目标指标：

- 路由收敛时间 ≤ 50 ms；
- 主节点失效导致子网瘫痪风险 ≤ 1%。

### 7.2 priority_scheduling

多业务并发时，优先保障控制指令和遥操作业务。

目标指标：

- 资源抢占解决率 ≥ 95%。

### 7.3 service_degradation

拥塞或链路退化时，对高清图像业务降码率。

目标指标：

- 业务降级决策时间 ≤ 200 ms；
- 高清影像回传成功率 ≥ 99.9%。

### 7.4 store_and_forward

科学数据回传中断时，进行缓存转发和断点续传。

目标指标：

- 科学数据回传中断 ≤ 1 s。

### 7.5 relay_pre_handover

月轨中继切换前预切换路径或启用缓存。

目标指标：

- 月轨中继切换端到端时延扰动 ≤ 50 ms。

## 8. 分层指标体系

软件必须计算三层指标。

### 8.1 物理层指标

- link_availability；
- channel_availability；
- snr_db；
- packet_loss_rate；
- bit_error_rate；
- antenna_gain_db；
- rf_health；
- ka_channel_availability。

### 8.2 网络层指标

- network_connectivity；
- end_to_end_delay_ms；
- route_convergence_time_ms；
- throughput_mbps；
- congestion_rate；
- subnet_paralysis_probability；
- relay_handover_delay_disturbance_ms。

### 8.3 业务层指标

- control_command_loss_rate；
- video_return_success_rate；
- science_data_interruption_s；
- service_degradation_decision_ms；
- resource_contention_resolution_rate；
- teleoperation_availability。

## 9. 技术指标验收表

软件最终必须输出一张指标达成表，至少包含：

1. RF 器件寿命预测误差 ≤ 10%；
2. 月尘天线增益衰减量化误差 ≤ 5%；
3. 主节点失效导致子网瘫痪风险 ≤ 1%；
4. 月轨中继切换端到端时延扰动 ≤ 50 ms；
5. Ka 频段信道可用率 ≥ 99.5%；
6. 路由收敛时间 ≤ 50 ms；
7. URLLC 指令丢包率 ≤ 1e-5；
8. 高清影像回传成功率 ≥ 99.9%；
9. 失效模式库覆盖 ≥ 8 类；
10. 级联故障预测准确率 ≥ 90%；
11. 故障传播时延量化误差 ≤ 15%；
12. 业务降级决策 ≤ 200 ms；
13. 资源抢占解决率 ≥ 95%；
14. 科学数据回传中断 ≤ 1 s。

对于 MVP 阶段，允许 RF 寿命预测误差、月尘增益衰减误差、级联故障预测准确率、故障传播时延误差采用参考基准模型进行验证，但必须在报告中明确说明基准来源是内置参考模型，后续可替换为文献数据或高保真仿真数据。

## 10. 软件运行方式

必须支持命令行运行：

python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/demo_run

运行后必须生成：

- outputs/demo_run/metrics_summary.csv
- outputs/demo_run/indicator_check.csv
- outputs/demo_run/fault_events.csv
- outputs/demo_run/service_results.csv
- outputs/demo_run/topology_before.png
- outputs/demo_run/topology_after.png
- outputs/demo_run/report.md

必须支持 Streamlit 展示：

streamlit run lunar_comm_sim/app/dashboard.py

## 11. 期望项目结构

请创建如下项目结构：

lunar-comm-resilience-mvp/
├─ README.md
├─ requirements.txt
├─ environment.yml
├─ configs/
│  └─ default_scenario.yaml
├─ docs/
│  ├─ mvp_design.md
│  ├─ technical_indicators.md
│  └─ model_assumptions.md
├─ lunar_comm_sim/
│  ├─ __init__.py
│  ├─ core/
│  │  ├─ __init__.py
│  │  ├─ scenario.py
│  │  ├─ topology.py
│  │  ├─ environment.py
│  │  ├─ link_model.py
│  │  ├─ services.py
│  │  ├─ faults.py
│  │  ├─ healing.py
│  │  ├─ metrics.py
│  │  └─ reporting.py
│  ├─ sim/
│  │  ├─ __init__.py
│  │  └─ engine.py
│  └─ app/
│     ├─ __init__.py
│     ├─ cli.py
│     └─ dashboard.py
├─ tests/
│  ├─ test_scenario_load.py
│  ├─ test_topology.py
│  ├─ test_metrics.py
│  └─ test_mvp_run.py
├─ scripts/
│  ├─ setup_env_windows.bat
│  └─ run_demo.bat
└─ outputs/

## 12. 编码要求

- 代码必须模块化；
- 所有核心模型必须有清晰注释；
- 不要把所有逻辑写在一个脚本里；
- 指标计算必须可追踪；
- 自愈前和自愈后的指标必须分别保存；
- 所有默认参数必须可在 YAML 配置文件中修改；
- 所有结果必须可导出 CSV 和 Markdown 报告；
- 必须提供 pytest 测试；
- 测试至少覆盖配置加载、拓扑连通性、指标计算和完整 MVP 运行。

## 13. 第一阶段开发目标

第一阶段只要求跑通最小闭环，不要求模型高保真。

第一阶段成功标准：

1. 可以加载 default_scenario.yaml；
2. 可以构建默认月面通信网络拓扑；
3. 可以注入 main_hub_failure、dust_antenna_degradation、relay_handover_delay、buffer_overflow 四类故障；
4. 可以执行重路由、优先级调度、业务降级、缓存转发；
5. 可以输出自愈前后指标对比；
6. 可以输出 indicator_check.csv，说明各技术指标是否满足；
7. 可以生成 report.md；
8. pytest 全部通过。