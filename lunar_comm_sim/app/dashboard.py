"""Streamlit dashboard for demo and batch experiment outputs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st


FINAL_DEMO_DIR = Path("outputs/final_demo/demo_run")
FALLBACK_DEMO_DIR = Path("outputs/demo_run")
FINAL_EXPERIMENT_DIR = Path("outputs/final_demo/experiments")
FALLBACK_EXPERIMENT_DIR = Path("outputs/experiments")

NODE_ZH = {
    "ground_station": "地球地面站",
    "lunar_orbiter": "月轨中继器",
    "lander_main_hub": "月面主枢纽",
    "relay_backup_1": "备用中继1",
    "relay_backup_2": "备用中继2",
    "edge_compute": "边缘计算节点",
    "science_station": "科学载荷站",
    "camera_station": "高清视频站",
    "teleop_terminal": "遥操作终端",
    "rover_1": "巡视器1",
    "rover_2": "巡视器2",
    "rover_3": "巡视器3",
    "all_rf_links": "全部射频链路",
    "active_topology": "当前可用拓扑",
    "relay_links": "中继链路",
}

COLUMN_ZH = {
    "phase": "阶段",
    "layer": "层级",
    "metric": "指标",
    "value": "数值",
    "id": "编号",
    "indicator": "指标名称",
    "operator": "判据",
    "threshold": "阈值",
    "actual": "实际值",
    "unit": "单位",
    "applicable": "适用",
    "status": "状态",
    "not_applicable_reason": "不适用原因",
    "passed": "通过",
    "verification_method": "验证方法",
    "service_id": "业务",
    "source": "源节点",
    "target": "目标",
    "path": "路径",
    "valid": "路由有效",
    "route_valid": "路由有效",
    "route_source": "路由来源",
    "reachable": "可达",
    "failure_reason": "失败原因",
    "notes": "备注",
    "fault_id": "故障编号",
    "fault_type": "故障类型",
    "start_s": "开始时间(s)",
    "duration_s": "持续时间(s)",
    "severity": "严重度",
    "applied_effect": "注入效果",
    "time_s": "时间(s)",
    "strategy": "自愈策略",
    "strategy_set": "策略组合",
    "action": "动作",
    "success": "成功",
    "measured_response_ms": "响应时间(ms)",
    "demand_mbps": "需求带宽(Mbps)",
    "throughput_mbps": "吞吐量(Mbps)",
    "end_to_end_delay_ms": "端到端时延(ms)",
    "packet_loss_rate": "丢包率",
    "availability": "可用率",
    "success_rate": "成功率",
    "interruption_s": "中断时间(s)",
    "degraded": "降级",
    "model": "模型",
    "input_temperature_c": "输入温度(℃)",
    "input_radiation_level": "输入辐射水平",
    "input_dust_level": "输入月尘水平",
    "predicted_value": "预测值",
    "reference_value": "参考值",
    "reference_gain_loss_db": "参考增益损失(dB)",
    "error_pct": "误差(%)",
    "target_error_pct": "目标误差(%)",
    "reference_source": "参考来源",
    "run_id": "运行编号",
    "experiment_type": "实验类型",
    "mutation_parameters": "扰动参数",
    "indicator_pass_count": "指标通过数",
    "indicator_total_count": "指标总数",
    "subnet_paralysis_probability": "子网瘫痪概率",
    "route_convergence_time_ms": "路由收敛时间(ms)",
    "relay_handover_delay_disturbance_ms": "中继切换扰动(ms)",
    "control_command_loss_rate": "控制指令丢包率",
    "video_return_success_rate": "视频回传成功率",
    "science_data_interruption_s": "科学数据中断时间(s)",
    "resource_contention_resolution_rate": "资源抢占解决率",
    "dust_level": "月尘水平",
    "antenna_gain_db": "天线增益(dB)",
    "snr_db": "信噪比(dB)",
    "ka_active_path_availability": "Ka有效路径可用率",
    "relay_handover_extra_delay_ms": "中继切换额外时延(ms)",
    "mean": "均值",
    "std": "标准差",
    "min": "最小值",
    "max": "最大值",
    "p50": "P50",
    "p95": "P95",
    "p99": "P99",
    "pass_rate": "通过率",
    "method": "方法",
}

VALUE_ZH = {
    "nominal": "正常状态",
    "before_healing": "故障后、自愈前",
    "after_healing": "自愈后",
    "physical": "物理层",
    "network": "网络层",
    "service": "业务层",
    "fault": "故障层",
    "passed": "通过",
    "failed": "未通过",
    "not_applicable": "不适用",
    "True": "是",
    "False": "否",
    "true": "是",
    "false": "否",
    "inf": "不可达",
    "control_command": "控制指令",
    "science_data": "科学数据",
    "hd_video": "高清视频",
    "teleoperation": "遥操作",
    "nominal_computed": "正常状态计算路由",
    "inherited_nominal": "继承正常状态路由",
    "reroute_backup_path": "备用路径重路由",
    "priority_scheduling": "优先级调度",
    "service_degradation": "业务降级",
    "store_and_forward": "存储转发",
    "relay_pre_handover": "中继预切换",
    "no_healing": "无自愈",
    "reroute_only": "仅重路由",
    "reroute_plus_priority": "重路由+优先级",
    "reroute_plus_priority_plus_degradation": "重路由+优先级+降级",
    "full_healing": "完整自愈",
    "main_hub_failure": "主枢纽失效",
    "dust_antenna_degradation": "月尘天线退化",
    "relay_handover_delay": "中继切换时延",
    "buffer_overflow": "缓存溢出",
    "radiation_cpu_lock": "辐射导致CPU锁死",
    "unreachable": "不可达",
    "inactive node lander_main_hub": "月面主枢纽失效",
    "recompute active backup paths": "重新计算可用备用路径",
    "reserve bandwidth and loss protection": "预留带宽并降低丢包",
    "reduce service bandwidth demand": "降低业务带宽需求",
    "enable buffer and resume forwarding": "启用缓存并恢复转发",
    "pre-stage handover and reduce disturbance": "预置切换并降低扰动",
    "primary hub disabled; backup paths remain available for rerouting": "主枢纽失效，备用路径可用于重路由",
    "RF links degraded by dust severity": "射频链路按月尘严重度退化",
    "relay handover disturbance set to 120.0 ms": "中继切换扰动设为120.0 ms",
    "congestion multiplier set to 2.20": "拥塞倍率设为2.20",
    "priority protection": "优先级保护",
    "delay target exceeded": "超过时延目标",
    "store and forward": "存储转发",
    "congested": "拥塞",
    "bitrate degraded": "码率降级",
    "rerouted services": "重路由业务数",
    "failed services": "失败业务数",
    "protected high-priority services": "已保护高优先级业务",
    "HD video bitrate reduced to degraded_bandwidth_mbps": "高清视频码率已降至降级带宽",
    "science data buffered for resume forwarding": "科学数据已缓存并等待恢复转发",
    "updated 4 relay links": "已更新4条中继链路",
}

METRIC_ZH = {
    "link_availability": "链路可用率",
    "channel_availability": "信道可用率",
    "snr_db": "信噪比(dB)",
    "packet_loss_rate": "丢包率",
    "bit_error_rate": "误码率",
    "antenna_gain_db": "天线增益(dB)",
    "rf_health": "射频健康度",
    "ka_channel_availability": "Ka信道可用率",
    "ka_configured_channel_availability": "Ka配置链路可用率",
    "ka_active_path_availability": "Ka有效路径可用率",
    "network_connectivity": "网络连通性",
    "end_to_end_delay_ms": "端到端时延(ms)",
    "route_convergence_time_ms": "路由收敛时间(ms)",
    "throughput_mbps": "吞吐量(Mbps)",
    "congestion_rate": "拥塞率",
    "subnet_paralysis_probability": "子网瘫痪概率",
    "relay_handover_delay_disturbance_ms": "中继切换扰动(ms)",
    "reachable_service_count": "可达业务数",
    "unreachable_service_count": "不可达业务数",
    "control_command_loss_rate": "控制指令丢包率",
    "video_return_success_rate": "视频回传成功率",
    "science_data_interruption_s": "科学数据中断时间(s)",
    "resource_contention_resolution_rate": "资源抢占解决率",
    "rf_lifetime_prediction_error_pct": "RF寿命预测误差(%)",
    "dust_gain_loss_quantification_error_pct": "月尘增益损失量化误差(%)",
    "predicted_rf_lifetime_h": "预测RF寿命(h)",
    "reference_rf_lifetime_h": "参考RF寿命(h)",
    "predicted_gain_loss_db": "预测增益损失(dB)",
    "reference_gain_loss_db": "参考增益损失(dB)",
    "fault_mode_library_coverage": "故障模式库覆盖数",
    "cascading_fault_prediction_accuracy": "级联故障预测准确率",
    "fault_propagation_delay_error_pct": "故障传播时延误差(%)",
    "service_degradation_decision_ms": "业务降级决策时间(ms)",
}


def resolve_demo_output_dir(
    preferred: Path = FINAL_DEMO_DIR,
    fallback: Path = FALLBACK_DEMO_DIR,
) -> Path:
    return preferred if (preferred / "metrics_summary.csv").exists() else fallback


def resolve_experiment_base_dir(
    preferred: Path = FINAL_EXPERIMENT_DIR,
    fallback: Path = FALLBACK_EXPERIMENT_DIR,
) -> Path:
    return preferred if preferred.exists() else fallback


def read_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path) if path.exists() else pd.DataFrame()


def localize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Return a localized copy for display without mutating raw CSV data."""

    localized = df.copy(deep=True)
    for column in localized.columns:
        localized[column] = localized[column].map(lambda value, col=column: _localize_value(value, col))
    return localized.rename(columns=COLUMN_ZH)


def count_passed(indicators: pd.DataFrame) -> tuple[int, int]:
    if indicators.empty:
        return 0, 0
    applicable = indicators
    if "applicable" in indicators:
        applicable = indicators[indicators["applicable"].astype(str).str.lower().eq("true")]
    if "status" in applicable:
        passed = applicable["status"].astype(str).eq("passed").sum()
    elif "passed" in applicable:
        passed = applicable["passed"].astype(str).str.lower().eq("true").sum()
    else:
        passed = 0
    return int(passed), int(len(applicable))


def show_pngs(directory: Path) -> None:
    pngs = sorted((directory / "plots").glob("*.png")) if (directory / "plots").exists() else []
    if not pngs:
        return
    st.subheader("实验图表")
    for index in range(0, len(pngs), 2):
        cols = st.columns(2)
        for col, image_path in zip(cols, pngs[index : index + 2]):
            col.image(str(image_path), caption=_localize_plot_name(image_path.name), width="stretch")


def discover_experiment_dirs(base_dir: Path) -> list[Path]:
    if (base_dir / "runs.csv").exists():
        return [base_dir]
    if not base_dir.exists():
        return []
    return sorted(path for path in base_dir.iterdir() if path.is_dir() and (path / "runs.csv").exists())


def _warn_missing(label: str, path: Path) -> None:
    if not path.exists():
        st.info(f"{label}尚未生成：{path}。请先运行最终验收脚本或单场景 demo 命令。")


def _display_dataframe(df: pd.DataFrame) -> None:
    st.dataframe(localize_dataframe(df), width="stretch", hide_index=True)


def _localize_value(value: Any, column: str) -> Any:
    if pd.isna(value):
        return value
    if isinstance(value, bool):
        return "是" if value else "否"
    text = str(value)
    if column == "path":
        return _localize_path(text)
    if column in {"source", "target"}:
        return _localize_identifier_list(text)
    if column == "metric":
        return METRIC_ZH.get(text, VALUE_ZH.get(text, text))
    if text in VALUE_ZH:
        return VALUE_ZH[text]
    if text in NODE_ZH:
        return NODE_ZH[text]
    return _replace_known_tokens(text)


def _localize_identifier_list(text: str) -> str:
    parts = [part.strip() for part in text.split(",")]
    return "，".join(VALUE_ZH.get(part, NODE_ZH.get(part, part)) for part in parts)


def _localize_path(path: str) -> str:
    return " -> ".join(NODE_ZH.get(part.strip(), part.strip()) for part in path.split("->"))


def _replace_known_tokens(text: str) -> str:
    localized = text
    for key, value in {**NODE_ZH, **VALUE_ZH, **METRIC_ZH}.items():
        localized = localized.replace(key, value)
    return localized


def _localized_indexed_series(df: pd.DataFrame, index_col: str, value_col: str) -> pd.Series:
    series = df.set_index(index_col)[value_col].copy()
    series.index = [_localize_value(index, index_col) for index in series.index]
    series.name = COLUMN_ZH.get(value_col, METRIC_ZH.get(value_col, value_col))
    return series


def _localized_line_data(df: pd.DataFrame, index_col: str, value_cols: list[str]) -> pd.DataFrame:
    chart_data = df.set_index(index_col)[value_cols].copy()
    chart_data.index.name = COLUMN_ZH.get(index_col, index_col)
    return chart_data.rename(columns={col: COLUMN_ZH.get(col, METRIC_ZH.get(col, col)) for col in value_cols})


def _localize_plot_name(name: str) -> str:
    mapping = {
        "subnet_paralysis_hist.png": "子网瘫痪概率分布",
        "route_convergence_hist.png": "路由收敛时间分布",
        "dust_vs_packet_loss.png": "月尘水平-丢包率",
        "dust_vs_antenna_gain.png": "月尘水平-天线增益",
        "handover_vs_delay_disturbance.png": "中继切换额外时延-扰动",
        "indicator_pass_count_bar.png": "指标通过数对比",
        "science_interruption_bar.png": "科学数据中断时间对比",
    }
    return mapping.get(name, name)


def main() -> None:
    st.set_page_config(page_title="月面通信网络韧性与自愈仿真平台", layout="wide")
    st.title("月面通信网络韧性与自愈仿真平台")

    default_demo_dir = resolve_demo_output_dir()
    default_experiment_base = resolve_experiment_base_dir()
    demo_dir = Path(st.sidebar.text_input("单场景输出目录", str(default_demo_dir)))
    experiment_base = Path(st.sidebar.text_input("批量实验输出根目录", str(default_experiment_base)))

    st.caption(f"当前单场景输出目录：`{demo_dir}`")
    st.caption(f"当前批量实验输出目录：`{experiment_base}`")

    metrics = read_csv(demo_dir / "metrics_summary.csv")
    indicators = read_csv(demo_dir / "indicator_check.csv")
    services = read_csv(demo_dir / "service_results.csv")
    routes = read_csv(demo_dir / "service_routes.csv")
    faults = read_csv(demo_dir / "fault_events.csv")
    healing = read_csv(demo_dir / "healing_actions.csv")
    propagation_predictions = read_csv(demo_dir / "fault_propagation_predictions.csv")
    observed_impacts = read_csv(demo_dir / "observed_impacts.csv")
    propagation_comparison = read_csv(demo_dir / "fault_propagation_comparison.csv")
    propagation_metrics = read_csv(demo_dir / "fault_propagation_metrics.csv")
    physical_validation = read_csv(demo_dir / "physical_model_validation.csv")
    physical_metrics = read_csv(demo_dir / "physical_model_metrics.csv")

    tab_overview, tab_closed_loop, tab_faults, tab_indicators, tab_experiments = st.tabs(
        [
            "MVP概览",
            "单场景闭环",
            "故障与自愈",
            "指标验收",
            "批量实验",
        ]
    )

    with tab_overview:
        _warn_missing("演示指标文件", demo_dir / "metrics_summary.csv")
        passed, total = count_passed(indicators)
        st.metric("技术指标通过数", f"{passed}/{total}")
        st.write("目标：以轻量、可追溯的MVP验证月面通信网络韧性评价与自愈闭环。")
        st.write("输出目录：", str(demo_dir))
        overview = pd.DataFrame(
            [
                {"研究内容": "拓扑与路由韧性", "软件模块": "topology.py, routing.py"},
                {"研究内容": "故障注入", "软件模块": "faults.py"},
                {"研究内容": "自愈策略", "软件模块": "healing.py"},
                {"研究内容": "批量验证", "软件模块": "experiments/*"},
            ]
        )
        st.dataframe(overview, width="stretch", hide_index=True)

    with tab_closed_loop:
        cols = st.columns(3)
        for col, name, caption in zip(
            cols,
            ["topology_nominal.png", "topology_before.png", "topology_after.png"],
            ["正常状态", "故障后、自愈前", "自愈后"],
        ):
            image_path = demo_dir / name
            if image_path.exists():
                col.image(str(image_path), caption=caption, width="stretch")
            else:
                col.info(f"缺少拓扑图：{name}")
        if not metrics.empty:
            st.subheader("三阶段指标")
            _display_dataframe(metrics)
        if not routes.empty:
            st.subheader("业务路由")
            _display_dataframe(routes)
        if not services.empty:
            st.subheader("业务仿真结果")
            _display_dataframe(services)

    with tab_faults:
        if faults.empty and healing.empty:
            st.info("故障与自愈输出尚未生成。")
        if not faults.empty:
            st.subheader("故障事件")
            _display_dataframe(faults)
        if not healing.empty:
            st.subheader("自愈动作")
            successful = healing["success"].astype(str).str.lower().eq("true").sum() if "success" in healing else 0
            st.metric("成功自愈动作数", int(successful))
            _display_dataframe(healing)
            if "measured_response_ms" in healing and "strategy" in healing:
                st.subheader("自愈策略响应时间")
                st.bar_chart(_localized_indexed_series(healing, "strategy", "measured_response_ms"))
        if not propagation_predictions.empty:
            st.subheader("故障传播预测")
            _display_dataframe(propagation_predictions)
        if not observed_impacts.empty:
            st.subheader("仿真观测影响")
            _display_dataframe(observed_impacts)
        if not propagation_comparison.empty:
            st.subheader("预测与观测对比")
            _display_dataframe(propagation_comparison)
        if not propagation_metrics.empty:
            st.subheader("故障传播指标")
            _display_dataframe(propagation_metrics)
            metric_map = dict(zip(propagation_metrics["metric"], propagation_metrics["value"]))
            if "cascading_fault_prediction_accuracy" in metric_map:
                st.metric("级联故障预测准确率", metric_map["cascading_fault_prediction_accuracy"])
            if "fault_propagation_delay_error_pct" in metric_map:
                st.metric("故障传播时延误差(%)", metric_map["fault_propagation_delay_error_pct"])

    with tab_indicators:
        if not indicators.empty:
            passed, total = count_passed(indicators)
            st.metric("通过数", f"{passed}/{total}")
            if "layer" in indicators:
                for layer, group in indicators.groupby("layer"):
                    st.subheader(_localize_value(layer, "layer"))
                    _display_dataframe(group)
            else:
                _display_dataframe(indicators)
            st.info("当前部分基准类指标使用MVP参考模型，后续可替换为文献数据、试验数据或高保真模型。")
        else:
            st.info("尚未找到指标验收文件。")
        if not physical_validation.empty:
            st.subheader("物理模型验证")
            _display_dataframe(physical_validation)
        if not physical_metrics.empty:
            metric_map = dict(zip(physical_metrics["metric"], physical_metrics["value"]))
            cols = st.columns(2)
            if "rf_lifetime_prediction_error_pct" in metric_map:
                cols[0].metric("RF寿命预测误差(%)", metric_map["rf_lifetime_prediction_error_pct"])
            if "dust_gain_loss_quantification_error_pct" in metric_map:
                cols[1].metric("月尘增益损失误差(%)", metric_map["dust_gain_loss_quantification_error_pct"])
            _display_dataframe(physical_metrics)
            dust_reference = Path("data/baselines/dust_gain_reference.csv")
            if dust_reference.exists():
                st.subheader("月尘增益损失参考曲线")
                ref = pd.read_csv(dust_reference)
                st.line_chart(_localized_line_data(ref, "dust_level", ["reference_gain_loss_db"]))

    with tab_experiments:
        st.write("批量实验输出根目录：", str(experiment_base))
        experiment_dirs = discover_experiment_dirs(experiment_base)
        if not experiment_dirs:
            st.info("尚未找到批量实验输出。请先运行最终验收脚本或实验命令。")
            return
        labels = [path.name for path in experiment_dirs]
        label_map = {label: VALUE_ZH.get(label, label) for label in labels}
        selected_display = st.selectbox("选择实验", [label_map[label] for label in labels], index=0)
        selected_label = next(label for label in labels if label_map[label] == selected_display)
        experiment_dir = experiment_dirs[labels.index(selected_label)]
        st.write("当前实验输出目录：", str(experiment_dir))

        runs = read_csv(experiment_dir / "runs.csv")
        summary = read_csv(experiment_dir / "summary.csv")
        mc_summary = read_csv(experiment_dir / "monte_carlo_summary.csv")
        report_path = experiment_dir / "experiment_report.md"
        if not runs.empty:
            st.subheader("实验运行明细")
            _display_dataframe(runs)
            if "strategy_set" in runs and "indicator_pass_count" in runs:
                st.subheader("策略组合指标通过数")
                st.bar_chart(_localized_indexed_series(runs, "strategy_set", "indicator_pass_count"))
            if "dust_level" in runs:
                chart_cols = [col for col in ["antenna_gain_db", "packet_loss_rate"] if col in runs]
                if chart_cols:
                    st.subheader("月尘水平影响曲线")
                    st.line_chart(_localized_line_data(runs, "dust_level", chart_cols))
            if "relay_handover_extra_delay_ms" in runs and "relay_handover_delay_disturbance_ms" in runs:
                st.subheader("中继切换扰动曲线")
                st.line_chart(_localized_line_data(runs, "relay_handover_extra_delay_ms", ["relay_handover_delay_disturbance_ms"]))
        if not summary.empty:
            st.subheader("实验统计汇总")
            _display_dataframe(summary)
        if not mc_summary.empty:
            st.subheader("蒙特卡洛风险统计")
            _display_dataframe(mc_summary)
        if report_path.exists():
            st.subheader("实验报告")
            st.info(f"实验报告文件已生成：{report_path}")
        show_pngs(experiment_dir)


if __name__ == "__main__":
    main()
