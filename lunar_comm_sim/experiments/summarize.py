"""Experiment CSV, plot, and Markdown summary helpers."""

from __future__ import annotations

import csv
import math
from pathlib import Path
from statistics import mean, pstdev
from typing import Any

import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt


def write_csv(path: str | Path, rows: list[dict[str, Any]]) -> None:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        output_path.write_text("", encoding="utf-8")
        return
    fieldnames = sorted({key for row in rows for key in row.keys()})
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def summarize_runs(rows: list[dict[str, Any]], indicators: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    thresholds = {
        item["metric"]: (item["operator"], float(item["threshold"]), bool(item.get("applicable", True)))
        for item in (indicators or [])
        if "metric" in item and "operator" in item and "threshold" in item
    }
    numeric_keys = [
        key
        for key in rows[0].keys()
        if key not in {"run_id", "experiment_type", "mutation_parameters", "stochastic_failed_links"} and _has_numeric_like_values(rows, key)
    ] if rows else []
    summary = []
    for key in numeric_keys:
        finite_values = _finite_values(rows, key)
        all_values = [_to_float_or_nan(row.get(key)) for row in rows]
        operator, threshold, applicable = thresholds.get(key, ("", "", True))
        pass_rate = ""
        pass_rate_all = ""
        pass_rate_applicable = ""
        passed_count = ""
        failed_count = ""
        if operator:
            passed = [_passes_threshold(value, operator, threshold) for value in all_values]
            passed_count = sum(1 for item in passed if item)
            failed_count = len(passed) - passed_count
            pass_rate_all = passed_count / len(passed) if passed else ""
            pass_rate_applicable = pass_rate_all if applicable else ""
            pass_rate = pass_rate_applicable if applicable else pass_rate_all
        summary.append(
            {
                "metric": key,
                "count": len(all_values),
                "finite_count": len(finite_values),
                "non_finite_count": len(all_values) - len(finite_values),
                "passed_count": passed_count,
                "failed_count": failed_count,
                "mean": mean(finite_values) if finite_values else math.nan,
                "std": pstdev(finite_values) if len(finite_values) > 1 else 0.0,
                "min": min(finite_values) if finite_values else math.nan,
                "max": max(finite_values) if finite_values else math.nan,
                "p50": _percentile(finite_values, 50),
                "p95": _percentile(finite_values, 95),
                "p99": _percentile(finite_values, 99),
                "pass_rate": pass_rate,
                "pass_rate_all": pass_rate_all,
                "pass_rate_applicable": pass_rate_applicable,
                "threshold": threshold,
                "operator": operator,
            }
        )
    return summary


def write_experiment_report(
    path: str | Path,
    experiment_config: dict[str, Any],
    rows: list[dict[str, Any]],
    summary_rows: list[dict[str, Any]],
    extra_lines: list[str] | None = None,
) -> None:
    meta = experiment_config.get("experiment", {})
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# Experiment Report: {meta.get('name', 'experiment')}",
        "",
        f"Purpose: {meta.get('purpose', 'MVP batch validation')}",
        "",
        f"Experiment type: `{meta.get('type', '')}`",
        f"Run count: {len(rows)}",
        "",
        "## Parameter Settings",
        "",
        "```yaml",
        _compact_config(experiment_config),
        "```",
        "",
        "## Key Statistics",
        "",
        "| Metric | Mean | P95 | P99 | Pass Rate |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for row in summary_rows:
        lines.append(
            f"| `{row['metric']}` | {_fmt(row['mean'])} | {_fmt(row['p95'])} | {_fmt(row['p99'])} | {_fmt(row['pass_rate'])} |"
        )
    lines.extend(
        [
            "",
            "## Relation To Single-Scenario Demo",
            "",
            "The single demo validates one deterministic scenario. This experiment repeats the same closed-loop simulator across parameter mutations to estimate sensitivity, risk, and strategy contribution.",
            "",
            "## Current Limitations",
            "",
            "The experiment layer still uses the MVP parameterized models rather than high-fidelity RF, orbital, queueing, or protocol-stack models.",
        ]
    )
    if extra_lines:
        lines.extend(["", "## Additional Notes", ""])
        lines.extend(extra_lines)
    output_path.write_text("\n".join(lines), encoding="utf-8")


def plot_hist(rows: list[dict[str, Any]], metric: str, path: str | Path, title: str) -> None:
    values = _finite_values(rows, metric)
    _ensure_plot_dir(path)
    plt.figure(figsize=(7, 4))
    plt.hist(values, bins=min(25, max(5, len(values))), color="#4f7cac", edgecolor="#1f2d3a")
    plt.title(title)
    plt.xlabel(metric)
    plt.ylabel("count")
    plt.tight_layout()
    plt.savefig(path, dpi=160)
    plt.close()


def plot_line(rows: list[dict[str, Any]], x_key: str, y_key: str, path: str | Path, title: str) -> None:
    pairs = sorted((float(row[x_key]), float(row[y_key])) for row in rows if _is_finite_number(row.get(x_key)) and _is_finite_number(row.get(y_key)))
    _ensure_plot_dir(path)
    plt.figure(figsize=(7, 4))
    plt.plot([x for x, _ in pairs], [y for _, y in pairs], marker="o", color="#4f7cac")
    plt.title(title)
    plt.xlabel(x_key)
    plt.ylabel(y_key)
    plt.tight_layout()
    plt.savefig(path, dpi=160)
    plt.close()


def plot_bar(rows: list[dict[str, Any]], x_key: str, y_key: str, path: str | Path, title: str) -> None:
    _ensure_plot_dir(path)
    plt.figure(figsize=(8, 4))
    labels = [str(row[x_key]) for row in rows]
    values = [float(row[y_key]) for row in rows]
    plt.bar(labels, values, color="#5b8def")
    plt.title(title)
    plt.xlabel(x_key)
    plt.ylabel(y_key)
    plt.xticks(rotation=25, ha="right")
    plt.tight_layout()
    plt.savefig(path, dpi=160)
    plt.close()


def _finite_values(rows: list[dict[str, Any]], key: str) -> list[float]:
    values = []
    for row in rows:
        value = row.get(key)
        if _is_number(value):
            number = float(value)
            if math.isfinite(number):
                values.append(number)
    return values


def _has_numeric_like_values(rows: list[dict[str, Any]], key: str) -> bool:
    return any(_is_number(row.get(key)) for row in rows)


def _to_float_or_nan(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return math.nan


def _passes_threshold(value: float, operator: str, threshold: float) -> bool:
    if not math.isfinite(value):
        return False
    return value <= threshold if operator == "<=" else value >= threshold


def _percentile(values: list[float], percentile: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return math.nan
    index = (len(ordered) - 1) * percentile / 100.0
    low = math.floor(index)
    high = math.ceil(index)
    if low == high:
        return ordered[int(index)]
    return ordered[low] * (high - index) + ordered[high] * (index - low)


def _is_number(value: Any) -> bool:
    try:
        float(value)
    except (TypeError, ValueError):
        return False
    return True


def _is_finite_number(value: Any) -> bool:
    if not _is_number(value):
        return False
    return math.isfinite(float(value))


def _fmt(value: Any) -> str:
    if value == "":
        return ""
    try:
        return f"{float(value):.6g}"
    except (TypeError, ValueError):
        return str(value)


def _ensure_plot_dir(path: str | Path) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)


def _compact_config(config: dict[str, Any]) -> str:
    import yaml

    return yaml.safe_dump(config, sort_keys=False).strip()
