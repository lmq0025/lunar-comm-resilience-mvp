"""CSV and Markdown reporting."""

from __future__ import annotations

import csv
from pathlib import Path
from typing import Any
import math

from lunar_comm_sim.core.scenario import Scenario


def write_csv(path: str | Path, rows: list[dict[str, Any]]) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        output_path.write_text("", encoding="utf-8")
        return

    fieldnames = list(rows[0].keys())
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_report(
    path: str | Path,
    scenario: Scenario,
    metrics: list[dict[str, Any]],
    indicators: list[dict[str, Any]],
    output_files: list[str],
    fault_rows: list[dict[str, Any]] | None = None,
    healing_rows: list[dict[str, Any]] | None = None,
    service_route_rows: list[dict[str, Any]] | None = None,
    propagation_predictions: list[dict[str, Any]] | None = None,
    observed_impacts: list[dict[str, Any]] | None = None,
    propagation_comparison: list[dict[str, Any]] | None = None,
    propagation_metrics: dict[str, Any] | None = None,
    physical_model_validation_rows: list[dict[str, Any]] | None = None,
    physical_model_metrics: dict[str, Any] | None = None,
) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    after = {
        row["metric"]: row["value"]
        for row in metrics
        if row["phase"] == "after_healing"
    }
    before = {
        row["metric"]: row["value"]
        for row in metrics
        if row["phase"] == "before_healing"
    }
    applicable_indicators = [row for row in indicators if str(row.get("applicable", True)).lower() == "true"]
    not_applicable_indicators = [row for row in indicators if str(row.get("applicable", True)).lower() != "true"]
    passed = sum(1 for row in applicable_indicators if row.get("status") == "passed" or row.get("passed") is True)
    fault_rows = fault_rows or []
    healing_rows = healing_rows or []
    service_route_rows = service_route_rows or []
    propagation_predictions = propagation_predictions or []
    observed_impacts = observed_impacts or []
    propagation_comparison = propagation_comparison or []
    propagation_metrics = propagation_metrics or {}
    physical_model_validation_rows = physical_model_validation_rows or []
    physical_model_metrics = physical_model_metrics or {}

    lines = [
        f"# Lunar Communication Resilience MVP Report",
        "",
        f"Scenario: `{scenario.name}`",
        f"Duration: {scenario.duration_s:g} s",
        "",
        "## Closed Loop",
        "",
        "Scenario configuration -> topology construction -> nominal route table -> fault injection -> inherited route validation -> self-healing route update -> service simulation -> layered metrics -> report generation.",
        "",
        "## Three-Phase Metric Comparison",
        "",
        "| Metric | Nominal | Before healing | After healing |",
        "| --- | ---: | ---: | ---: |",
    ]
    for metric in [
        "network_connectivity",
        "subnet_paralysis_probability",
        "route_convergence_time_ms",
        "relay_handover_delay_disturbance_ms",
        "control_command_loss_rate",
        "video_return_success_rate",
        "science_data_interruption_s",
        "ka_channel_availability",
        "ka_configured_channel_availability",
        "ka_active_path_availability",
    ]:
        lines.append(
            f"| `{metric}` | {_metric(metrics, 'nominal', metric)} | {_metric(metrics, 'before_healing', metric)} | {_metric(metrics, 'after_healing', metric)} |"
        )

    lines.extend(
        [
            "",
            "## Service Route Comparison",
            "",
            "| Phase | Service | Valid | Source | Path | Notes |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
    )
    for row in service_route_rows:
        lines.append(
            f"| {row.get('phase', '')} | {row.get('service_id', '')} | {row.get('valid', '')} | {row.get('route_source', '')} | {row.get('path', '')} | {row.get('notes', '')} |"
        )

    lines.extend(
        [
            "",
            "## Fault Events",
            "",
            "| Fault | Target | Start (s) | Duration (s) | Severity | Effect |",
            "| --- | --- | ---: | ---: | ---: | --- |",
        ]
    )
    for row in fault_rows:
        lines.append(
            f"| {row.get('fault_type', '')} | {row.get('target', '')} | {row.get('start_s', '')} | {row.get('duration_s', '')} | {row.get('severity', '')} | {row.get('applied_effect', '')} |"
        )

    lines.extend(
        [
            "",
            "## Healing Actions",
            "",
            "| Strategy | Target | Success | Response (ms) | Notes |",
            "| --- | --- | --- | ---: | --- |",
        ]
    )
    for row in healing_rows:
        lines.append(
            f"| {row.get('strategy', '')} | {row.get('target', '')} | {row.get('success', '')} | {row.get('measured_response_ms', '')} | {row.get('notes', '')} |"
        )

    lines.extend(
        [
            "",
            "## Fault Propagation Prediction",
            "",
            f"Propagation model enabled: {scenario.fault_propagation.get('enabled', False)}",
            f"Configured propagation nodes: {len(scenario.fault_propagation.get('nodes', []))}",
            f"Configured propagation edges: {len(scenario.fault_propagation.get('edges', []))}",
            "",
            "### Predicted Paths",
            "",
            "| Root fault | Predicted effect | Layer | Probability | Delay (ms) | Path |",
            "| --- | --- | --- | ---: | ---: | --- |",
        ]
    )
    for row in propagation_predictions:
        lines.append(
            f"| {row.get('root_fault', '')} | {row.get('predicted_effect', '')} | {row.get('predicted_layer', '')} | {_fmt(row.get('predicted_probability'))} | {_fmt(row.get('predicted_delay_ms'))} | {row.get('propagation_path', '')} |"
        )

    lines.extend(
        [
            "",
            "### Observed Impacts",
            "",
            "| Impact | Layer | Delay (ms) | Evidence |",
            "| --- | --- | ---: | --- |",
        ]
    )
    for row in observed_impacts:
        lines.append(
            f"| {row.get('observed_effect', '')} | {row.get('observed_layer', '')} | {_fmt(row.get('observed_delay_ms'))} | {row.get('evidence', '')} |"
        )

    lines.extend(
        [
            "",
            "### Prediction Comparison",
            "",
            "| Effect | Observed | TP | FP | FN | Delay error (%) |",
            "| --- | --- | --- | --- | --- | ---: |",
        ]
    )
    for row in propagation_comparison:
        lines.append(
            f"| {row.get('predicted_effect', '')} | {row.get('observed', '')} | {row.get('true_positive', '')} | {row.get('false_positive', '')} | {row.get('false_negative', '')} | {_fmt(row.get('delay_error_pct'))} |"
        )
    lines.extend(
        [
            "",
            f"- Cascading fault prediction accuracy: {_fmt(propagation_metrics.get('cascading_fault_prediction_accuracy'))}",
            f"- Fault propagation delay error: {_fmt(propagation_metrics.get('fault_propagation_delay_error_pct'))}%",
            "- Current delay errors are based on MVP-level event timing assumptions, not high-fidelity physical propagation measurements.",
        ]
    )

    lines.extend(
        [
            "",
            "## Physical Influence Model Validation",
            "",
            "RF lifetime and lunar-dust antenna gain-loss errors are calculated by comparing MVP model predictions with internal replaceable reference curves.",
            "",
            "| Model | Predicted | Reference | Error (%) | Target (%) | Passed | Reference source |",
            "| --- | ---: | ---: | ---: | ---: | --- | --- |",
        ]
    )
    for row in physical_model_validation_rows:
        lines.append(
            f"| {row.get('model', '')} | {_fmt(row.get('predicted_value'))} | {_fmt(row.get('reference_value'))} | {_fmt(row.get('error_pct'))} | {_fmt(row.get('target_error_pct'))} | {row.get('passed', '')} | {row.get('reference_source', '')} |"
        )
    lines.extend(
        [
            "",
            f"- RF lifetime prediction error: {_fmt(physical_model_metrics.get('rf_lifetime_prediction_error_pct'))}%",
            f"- Dust gain loss quantification error: {_fmt(physical_model_metrics.get('dust_gain_loss_quantification_error_pct'))}%",
            "- The reference curves are MVP internal baselines that can be replaced by literature, high-fidelity simulation, or test data.",
            "",
            "## Before/After Improvements",
            "",
            f"- Subnet paralysis probability delta: {_delta(before.get('subnet_paralysis_probability'), after.get('subnet_paralysis_probability'))}",
            f"- Relay handover disturbance delta: {_delta(before.get('relay_handover_delay_disturbance_ms'), after.get('relay_handover_delay_disturbance_ms'))} ms",
            f"- HD video success-rate delta: {_delta(before.get('video_return_success_rate'), after.get('video_return_success_rate'))}",
            f"- Science-data interruption delta: {_delta(before.get('science_data_interruption_s'), after.get('science_data_interruption_s'))} s",
            "",
            "## Key After-Healing Metrics",
        ]
    )
    lines.extend(
        [
        "",
        f"- Network connectivity: {_fmt(after.get('network_connectivity'))}",
        f"- Route convergence time: {_fmt(after.get('route_convergence_time_ms'))} ms",
        f"- Relay handover disturbance: {_fmt(after.get('relay_handover_delay_disturbance_ms'))} ms",
        f"- Control command loss rate: {_fmt(after.get('control_command_loss_rate'))}",
        f"- HD video success rate: {_fmt(after.get('video_return_success_rate'))}",
        f"- Science data interruption: {_fmt(after.get('science_data_interruption_s'))} s",
        "",
        "## Indicator Check",
        "",
        f"{passed}/{len(applicable_indicators)} applicable technical indicators passed. Total configured indicators: {len(indicators)}.",
        "",
        "Not applicable indicators are not failures; they indicate the current scenario did not trigger the required validation condition.",
        "",
        "### Not Applicable Indicators",
        "",
        "| Indicator | Reason |",
        "| --- | --- |",
        *[
            f"| {row.get('indicator', row.get('id', ''))} | {row.get('not_applicable_reason', '')} |"
            for row in not_applicable_indicators
        ],
        "",
        "Benchmark note: RF lifetime prediction error and lunar-dust gain-loss quantification error now compare MVP model predictions with internal replaceable reference curves. Propagation accuracy metrics use the MVP propagation graph when enabled.",
        "",
        "Ka availability note: `ka_channel_availability` currently uses the active business-path definition and is mirrored by `ka_active_path_availability`; `ka_configured_channel_availability` counts all configured Ka-class links and treats inactive links as zero availability.",
        "",
        "High-fidelity gaps: this MVP still does not model real 5G/WiFi protocol behavior, RF propagation, antenna pointing, orbital geometry, queue-level packet scheduling, or Monte Carlo fault propagation.",
        "",
        "## Generated Artifacts",
        "",
        ]
    )
    lines.extend(f"- `{name}`" for name in output_files)
    lines.append("")
    output_path.write_text("\n".join(lines), encoding="utf-8")


def _fmt(value: Any) -> str:
    try:
        number = float(value)
        if not math.isfinite(number):
            return "N/A"
        return f"{number:.6g}"
    except (TypeError, ValueError):
        return "n/a"


def _metric(metrics: list[dict[str, Any]], phase: str, metric: str) -> str:
    for row in metrics:
        if row["phase"] == phase and row["metric"] == metric:
            return _fmt(row["value"])
    return "n/a"


def _delta(before: Any, after: Any) -> str:
    try:
        return f"{float(after) - float(before):.6g}"
    except (TypeError, ValueError):
        return "n/a"
