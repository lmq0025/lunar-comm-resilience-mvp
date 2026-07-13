"""Parameterized lunar environmental effects."""

from __future__ import annotations

from typing import Any


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def environmental_link_effects(
    base: dict[str, Any],
    environment: dict[str, Any],
    params: dict[str, Any],
) -> dict[str, float]:
    """Return link attributes after dust, temperature, radiation, and obstruction effects."""

    dust_level = float(environment.get("dust_level", 0.0))
    temperature_c = float(environment.get("temperature_c", 0.0))
    radiation_level = float(environment.get("radiation_level", 0.0))
    obstruction_probability = float(environment.get("obstruction_probability", 0.0))

    k_dust_db = float(params.get("k_dust_db", 3.0))
    nominal_gain = float(params.get("nominal_antenna_gain_db", 24.0))
    nominal_snr = float(params.get("nominal_snr_db", 21.0))
    temp_min = float(params.get("thermal_nominal_min_c", -80))
    temp_max = float(params.get("thermal_nominal_max_c", 60))

    if temperature_c < temp_min:
        temp_stress = (temp_min - temperature_c) / 100.0
    elif temperature_c > temp_max:
        temp_stress = (temperature_c - temp_max) / 100.0
    else:
        temp_stress = 0.0

    dust_gain_loss_db = k_dust_db * dust_level
    antenna_gain_db = nominal_gain - dust_gain_loss_db
    snr_db = nominal_snr - dust_gain_loss_db - temp_stress * 4.0 - radiation_level * 0.5

    loss_multiplier = 1.0 + dust_level * 1.8 + temp_stress * 1.5 + radiation_level * 0.5
    packet_loss_rate = clamp(float(base["packet_loss_rate"]) * loss_multiplier, 0.0, 0.35)

    availability_penalty = dust_level * 0.0008 + obstruction_probability * 0.003 + temp_stress * 0.0005
    availability = clamp(float(base["availability"]) - availability_penalty, 0.0, 1.0)
    rf_health = clamp(1.0 - dust_level * 0.08 - temp_stress * 0.10 - radiation_level * 0.05, 0.0, 1.0)

    return {
        "antenna_gain_db": antenna_gain_db,
        "snr_db": snr_db,
        "packet_loss_rate": packet_loss_rate,
        "bit_error_rate": packet_loss_rate / 10.0,
        "availability": availability,
        "rf_health": rf_health,
        "dust_gain_loss_db": dust_gain_loss_db,
    }
