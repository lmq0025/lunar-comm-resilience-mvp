"""Scenario mutation helpers for experiments."""

from __future__ import annotations

from copy import deepcopy
from pathlib import Path
from typing import Any

import yaml


BACKUP_LINK_ENDPOINTS = {
    ("rover_1", "relay_backup_1"),
    ("rover_2", "relay_backup_2"),
    ("teleop_terminal", "relay_backup_2"),
    ("science_station", "relay_backup_1"),
    ("camera_station", "relay_backup_2"),
    ("edge_compute", "relay_backup_1"),
}


def load_raw_scenario(path: str | Path) -> dict[str, Any]:
    return yaml.safe_load(Path(path).read_text(encoding="utf-8"))


def clone_raw(raw: dict[str, Any]) -> dict[str, Any]:
    if hasattr(raw, "raw"):
        raw = raw.raw
    return deepcopy(raw)


def set_dust_level(raw: dict[str, Any], value: float) -> dict[str, Any]:
    mutated = clone_raw(raw)
    mutated.setdefault("environment", {})["dust_level"] = float(value)
    return mutated


def set_relay_handover_extra_delay_ms(raw: dict[str, Any], value: float) -> dict[str, Any]:
    mutated = clone_raw(raw)
    mutated.setdefault("environment", {}).setdefault("relay_handover", {})["handover_extra_delay_ms"] = float(value)
    return mutated


def set_fault_severity(raw: dict[str, Any], fault_type: str, severity: float) -> dict[str, Any]:
    mutated = clone_raw(raw)
    for fault in mutated.get("faults", {}).get("schedule", []):
        if fault.get("type") == fault_type:
            fault["severity"] = float(severity)
    return mutated


def set_link_availability_by_kind(raw: dict[str, Any], link_kind: str, availability: float) -> dict[str, Any]:
    mutated = clone_raw(raw)
    for link in mutated.get("links", []):
        if link.get("kind") == link_kind:
            link["availability"] = float(availability)
    return mutated


def set_backup_link_availability(raw: dict[str, Any], availability: float) -> dict[str, Any]:
    mutated = clone_raw(raw)
    for link in mutated.get("links", []):
        endpoints = (link.get("source"), link.get("target"))
        if endpoints in BACKUP_LINK_ENDPOINTS or endpoints[::-1] in BACKUP_LINK_ENDPOINTS or link.get("kind") == "redundant_surface":
            link["availability"] = float(availability)
    return mutated


def set_healing_enabled(raw: dict[str, Any], strategies: list[str]) -> dict[str, Any]:
    mutated = clone_raw(raw)
    mutated.setdefault("healing", {})["enabled"] = list(strategies)
    return mutated


def set_enabled_fault_types(raw: dict[str, Any], fault_types: list[str]) -> dict[str, Any]:
    mutated = clone_raw(raw)
    mutated.setdefault("faults", {})["enabled"] = list(fault_types)
    return mutated


def disable_fault_types(raw: dict[str, Any], fault_types: list[str]) -> dict[str, Any]:
    mutated = clone_raw(raw)
    enabled = list(mutated.setdefault("faults", {}).get("enabled", []))
    mutated["faults"]["enabled"] = [fault for fault in enabled if fault not in set(fault_types)]
    return mutated


def enable_fault_types(raw: dict[str, Any], fault_types: list[str]) -> dict[str, Any]:
    mutated = clone_raw(raw)
    enabled = list(mutated.setdefault("faults", {}).get("enabled", []))
    for fault_type in fault_types:
        if fault_type not in enabled:
            enabled.append(fault_type)
    mutated["faults"]["enabled"] = enabled
    return mutated


def set_fault_schedule(raw: dict[str, Any], schedule: list[dict[str, Any]]) -> dict[str, Any]:
    mutated = clone_raw(raw)
    mutated.setdefault("faults", {})["schedule"] = deepcopy(schedule)
    return mutated


def disable_backup_links(raw: dict[str, Any]) -> dict[str, Any]:
    mutated = clone_raw(raw)
    kept = []
    for link in mutated.get("links", []):
        endpoints = (link.get("source"), link.get("target"))
        if endpoints in BACKUP_LINK_ENDPOINTS or endpoints[::-1] in BACKUP_LINK_ENDPOINTS:
            continue
        kept.append(link)
    mutated["links"] = kept
    return mutated


def apply_mutations(raw: dict[str, Any], mutations: dict[str, Any] | None) -> dict[str, Any]:
    mutated = clone_raw(raw)
    for key, value in (mutations or {}).items():
        if key == "dust_level":
            mutated = set_dust_level(mutated, value)
        elif key == "relay_handover_extra_delay_ms":
            mutated = set_relay_handover_extra_delay_ms(mutated, value)
        elif key == "healing_enabled":
            mutated = set_healing_enabled(mutated, list(value))
        elif key == "disable_backup_links" and value:
            mutated = disable_backup_links(mutated)
        elif key == "backup_link_availability":
            mutated = set_backup_link_availability(mutated, value)
        elif key == "disable_fault_types":
            mutated = disable_fault_types(mutated, list(value))
        elif key == "enable_fault_types":
            mutated = enable_fault_types(mutated, list(value))
        elif key == "set_fault_schedule":
            mutated = set_fault_schedule(mutated, list(value))
        elif key.endswith("_severity"):
            fault_type = key.removesuffix("_severity")
            mutated = set_fault_severity(mutated, fault_type, value)
    return mutated


def write_raw_scenario(raw: dict[str, Any], path: str | Path) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(yaml.safe_dump(raw, sort_keys=False), encoding="utf-8")
    return output_path
