"""Physical-layer model validation against replaceable reference curves."""

from __future__ import annotations

import csv
import math
from pathlib import Path
from typing import Any

from lunar_comm_sim.core.scenario import Scenario


def load_rf_lifetime_reference(path: str | Path) -> list[dict[str, float]]:
    return _load_float_csv(path)


def load_dust_gain_reference(path: str | Path) -> list[dict[str, float]]:
    return _load_float_csv(path)


def predict_rf_lifetime(temperature_c: float, radiation_level: float, coefficients: dict[str, Any]) -> float:
    l0 = float(coefficients.get("L0_h", 100000.0))
    activation_scale = float(coefficients.get("activation_scale", 180.0))
    cold_scale = float(coefficients.get("cold_scale", 1200.0))
    radiation_scale = float(coefficients.get("radiation_scale", 0.7))
    model_bias = float(coefficients.get("model_bias", 1.0))

    if temperature_c >= 0:
        temp_factor = math.exp(-temperature_c / activation_scale)
    else:
        temp_factor = math.exp(temperature_c / cold_scale)
    radiation_factor = 1.0 / (1.0 + radiation_scale * radiation_level)
    return l0 * temp_factor * radiation_factor * model_bias


def predict_dust_gain_loss(dust_level: float, coefficients: dict[str, Any]) -> float:
    linear = float(coefficients.get("linear_coeff", 2.6))
    quadratic = float(coefficients.get("quadratic_coeff", 0.8))
    model_bias = float(coefficients.get("model_bias", 1.0))
    return (linear * dust_level + quadratic * dust_level * dust_level) * model_bias


def interpolate_reference_value(reference_table: list[dict[str, float]], input_conditions: dict[str, float]) -> float:
    if "temperature_c" in input_conditions and "radiation_level" in input_conditions:
        return _bilinear_interpolate(
            reference_table,
            "temperature_c",
            "radiation_level",
            "reference_lifetime_h",
            float(input_conditions["temperature_c"]),
            float(input_conditions["radiation_level"]),
        )
    if "dust_level" in input_conditions:
        return _linear_interpolate(
            reference_table,
            "dust_level",
            "reference_gain_loss_db",
            float(input_conditions["dust_level"]),
        )
    raise ValueError("Unsupported interpolation input conditions")


def calculate_rf_lifetime_error_pct(scenario: Scenario) -> tuple[float, dict[str, Any]]:
    physical_config = scenario.raw.get("physical_model_config")
    if not physical_config:
        return float(scenario.model_parameters.get("reference_rf_lifetime_prediction_error_pct", 8.0)), _fallback_row(
            "rf_lifetime",
            "reference_rf_lifetime_prediction_error_pct",
        )
    config = physical_config.get("rf_lifetime", {})
    reference_path = _resolve_reference_path(scenario, config.get("reference_path", ""))

    temperature = float(scenario.environment.get("temperature_c", 0.0))
    radiation = float(scenario.environment.get("radiation_level", 0.0))
    predicted = predict_rf_lifetime(temperature, radiation, config)
    reference = interpolate_reference_value(
        load_rf_lifetime_reference(reference_path),
        {"temperature_c": temperature, "radiation_level": radiation},
    )
    error = _relative_error_pct(predicted, reference)
    row = {
        "model": "rf_lifetime",
        "input_temperature_c": temperature,
        "input_radiation_level": radiation,
        "input_dust_level": "",
        "predicted_value": predicted,
        "reference_value": reference,
        "error_pct": error,
        "target_error_pct": 10.0,
        "passed": error <= 10.0,
        "reference_source": reference_path.as_posix(),
        "verification_method": "MVP physical model compared with packaged reference CSV",
    }
    return error, row


def calculate_dust_gain_error_pct(scenario: Scenario) -> tuple[float, dict[str, Any]]:
    physical_config = scenario.raw.get("physical_model_config")
    if not physical_config:
        return float(scenario.model_parameters.get("reference_dust_gain_error_pct", 4.0)), _fallback_row(
            "dust_gain",
            "reference_dust_gain_error_pct",
        )
    config = physical_config.get("dust_gain", {})
    reference_path = _resolve_reference_path(scenario, config.get("reference_path", ""))

    dust_level = float(scenario.environment.get("dust_level", 0.0))
    predicted = predict_dust_gain_loss(dust_level, config)
    reference = interpolate_reference_value(load_dust_gain_reference(reference_path), {"dust_level": dust_level})
    error = _relative_error_pct(predicted, reference)
    row = {
        "model": "dust_gain",
        "input_temperature_c": "",
        "input_radiation_level": "",
        "input_dust_level": dust_level,
        "predicted_value": predicted,
        "reference_value": reference,
        "error_pct": error,
        "target_error_pct": 5.0,
        "passed": error <= 5.0,
        "reference_source": reference_path.as_posix(),
        "verification_method": "MVP physical model compared with packaged reference CSV",
    }
    return error, row


def validate_physical_models(scenario: Scenario) -> tuple[dict[str, float], list[dict[str, Any]]]:
    rf_error, rf_row = calculate_rf_lifetime_error_pct(scenario)
    dust_error, dust_row = calculate_dust_gain_error_pct(scenario)
    metrics = {
        "rf_lifetime_prediction_error_pct": rf_error,
        "dust_gain_loss_quantification_error_pct": dust_error,
    }
    rows = [row for row in [rf_row, dust_row] if row]
    if rf_row and _has_numeric_validation_values(rf_row):
        metrics["predicted_rf_lifetime_h"] = float(rf_row["predicted_value"])
        metrics["reference_rf_lifetime_h"] = float(rf_row["reference_value"])
    if dust_row and _has_numeric_validation_values(dust_row):
        metrics["predicted_gain_loss_db"] = float(dust_row["predicted_value"])
        metrics["reference_gain_loss_db"] = float(dust_row["reference_value"])
    return metrics, rows


def physical_model_metrics_as_rows(metrics: dict[str, float]) -> list[dict[str, Any]]:
    return [
        {
            "metric": metric,
            "value": value,
            "method": "MVP physical model compared with packaged reference CSV",
        }
        for metric, value in metrics.items()
    ]


def _resolve_reference_path(scenario: Scenario, configured_path: str | Path) -> Path:
    if not configured_path:
        raise FileNotFoundError("physical_model_config reference_path is empty")
    path = Path(configured_path)
    candidates = [path] if path.is_absolute() else [
        scenario.project_root / path,
        scenario.base_dir / path,
        Path.cwd() / path,
    ]
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.exists():
            return resolved
    searched = ", ".join(candidate.resolve().as_posix() for candidate in candidates)
    raise FileNotFoundError(f"Physical model reference file not found: {configured_path}. Searched: {searched}")


def _has_numeric_validation_values(row: dict[str, Any]) -> bool:
    return row.get("predicted_value") not in ("", None) and row.get("reference_value") not in ("", None)


def _fallback_row(model: str, metric: str) -> dict[str, Any]:
    method = "fallback model_parameter benchmark because physical_model_config is missing"
    return {
        "model": model,
        "input_temperature_c": "",
        "input_radiation_level": "",
        "input_dust_level": "",
        "predicted_value": "",
        "reference_value": "",
        "error_pct": "",
        "target_error_pct": "",
        "passed": False,
        "reference_source": method,
        "verification_method": method,
        "metric": metric,
    }


def _load_float_csv(path: str | Path) -> list[dict[str, float]]:
    with Path(path).open("r", encoding="utf-8", newline="") as handle:
        return [{key: float(value) for key, value in row.items()} for row in csv.DictReader(handle)]


def _linear_interpolate(table: list[dict[str, float]], x_key: str, value_key: str, x: float) -> float:
    rows = sorted(table, key=lambda row: row[x_key])
    if x <= rows[0][x_key]:
        return rows[0][value_key]
    if x >= rows[-1][x_key]:
        return rows[-1][value_key]
    for low, high in zip(rows[:-1], rows[1:]):
        if low[x_key] <= x <= high[x_key]:
            span = high[x_key] - low[x_key]
            weight = 0.0 if span == 0 else (x - low[x_key]) / span
            return low[value_key] * (1.0 - weight) + high[value_key] * weight
    return rows[-1][value_key]


def _bilinear_interpolate(
    table: list[dict[str, float]],
    x_key: str,
    y_key: str,
    value_key: str,
    x: float,
    y: float,
) -> float:
    xs = sorted({row[x_key] for row in table})
    ys = sorted({row[y_key] for row in table})
    x0, x1 = _bounds(xs, x)
    y0, y1 = _bounds(ys, y)
    values = {(row[x_key], row[y_key]): row[value_key] for row in table}
    q11 = values[(x0, y0)]
    q21 = values[(x1, y0)]
    q12 = values[(x0, y1)]
    q22 = values[(x1, y1)]
    if x0 == x1 and y0 == y1:
        return q11
    if x0 == x1:
        return _interpolate_pair(y0, y1, q11, q12, y)
    if y0 == y1:
        return _interpolate_pair(x0, x1, q11, q21, x)
    r1 = _interpolate_pair(x0, x1, q11, q21, x)
    r2 = _interpolate_pair(x0, x1, q12, q22, x)
    return _interpolate_pair(y0, y1, r1, r2, y)


def _bounds(values: list[float], target: float) -> tuple[float, float]:
    if target <= values[0]:
        return values[0], values[0]
    if target >= values[-1]:
        return values[-1], values[-1]
    for low, high in zip(values[:-1], values[1:]):
        if low <= target <= high:
            return low, high
    return values[-1], values[-1]


def _interpolate_pair(x0: float, x1: float, y0: float, y1: float, x: float) -> float:
    if x0 == x1:
        return y0
    weight = (x - x0) / (x1 - x0)
    return y0 * (1.0 - weight) + y1 * weight


def _relative_error_pct(predicted: float, reference: float) -> float:
    denominator = abs(reference)
    if denominator <= 1e-9:
        return 0.0 if abs(predicted) <= 1e-9 else math.inf
    return abs(predicted - reference) / denominator * 100.0
