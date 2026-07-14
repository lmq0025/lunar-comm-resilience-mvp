"""Scenario loading and validation helpers."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml


@dataclass(frozen=True)
class NodeConfig:
    id: str
    type: str
    role: str
    name: str | None = None
    position_x: float | None = None
    position_y: float | None = None
    active: bool = True
    availability: float = 1.0
    node_processing_delay_ms: float = 0.0

    def __post_init__(self) -> None:
        if not 0 <= float(self.availability) <= 1:
            raise ValueError(f"Node {self.id} availability must be between 0 and 1")
        if float(self.node_processing_delay_ms) < 0:
            raise ValueError(f"Node {self.id} node_processing_delay_ms must be >= 0")


@dataclass(frozen=True)
class LinkConfig:
    source: str
    target: str
    kind: str
    bandwidth_mbps: float
    delay_ms: float
    packet_loss_rate: float
    availability: float
    active: bool = True
    id: str | None = None
    name: str | None = None


@dataclass(frozen=True)
class ServiceConfig:
    id: str
    source: str
    target: str
    priority: int
    required_bandwidth_mbps: float
    name: str | None = None
    service_type: str | None = None
    max_delay_ms: float | None = None
    max_loss_rate: float | None = None
    max_interruption_s: float | None = None
    min_success_rate: float | None = None
    degraded_bandwidth_mbps: float | None = None

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("Service id must be non-empty")
        if self.source == self.target:
            raise ValueError(f"Service {self.id} source and target must be different")
        if int(self.priority) < 0:
            raise ValueError(f"Service {self.id} priority must be >= 0")
        if float(self.required_bandwidth_mbps) <= 0:
            raise ValueError(f"Service {self.id} required_bandwidth_mbps must be > 0")
        if self.max_delay_ms is not None and float(self.max_delay_ms) < 0:
            raise ValueError(f"Service {self.id} max_delay_ms must be >= 0")
        if self.max_loss_rate is not None and not 0 <= float(self.max_loss_rate) <= 1:
            raise ValueError(f"Service {self.id} max_loss_rate must be between 0 and 1")
        if self.max_interruption_s is not None and float(self.max_interruption_s) < 0:
            raise ValueError(f"Service {self.id} max_interruption_s must be >= 0")
        if self.min_success_rate is not None and not 0 <= float(self.min_success_rate) <= 1:
            raise ValueError(f"Service {self.id} min_success_rate must be between 0 and 1")
        if self.degraded_bandwidth_mbps is not None:
            if float(self.degraded_bandwidth_mbps) <= 0:
                raise ValueError(f"Service {self.id} degraded_bandwidth_mbps must be > 0")
            if float(self.degraded_bandwidth_mbps) > float(self.required_bandwidth_mbps):
                raise ValueError(
                    f"Service {self.id} degraded_bandwidth_mbps must be <= required_bandwidth_mbps"
                )


@dataclass(frozen=True)
class FaultConfig:
    id: str
    type: str
    start_s: float
    duration_s: float
    target: str
    severity: float
    enabled: bool = True


@dataclass(frozen=True)
class TechnicalIndicatorConfig:
    id: str
    name: str
    layer: str
    operator: str
    threshold: float
    unit: str
    metric: str
    verification_method: str
    applicable_when: dict[str, Any] | None = None


@dataclass(frozen=True)
class Scenario:
    name: str
    duration_s: float
    random_seed: int
    environment: dict[str, Any]
    model_parameters: dict[str, Any]
    nodes: list[NodeConfig]
    links: list[LinkConfig]
    services: list[ServiceConfig]
    faults_enabled: list[str]
    faults: list[FaultConfig]
    healing_enabled: list[str]
    technical_indicators: list[TechnicalIndicatorConfig]
    fault_propagation: dict[str, Any]
    base_dir: Path
    project_root: Path
    raw: dict[str, Any]


def load_scenario(path: str | Path) -> Scenario:
    """Load a YAML scenario into typed records used by the simulator."""

    scenario_path = Path(path)
    with scenario_path.open("r", encoding="utf-8") as handle:
        raw = yaml.safe_load(handle)

    return load_scenario_from_dict(raw, base_dir=scenario_path.resolve().parent)


def load_scenario_from_dict(raw: dict[str, Any], base_dir: str | Path | None = None) -> Scenario:
    """Load a scenario from an already parsed YAML dictionary."""

    required_sections = ["scenario", "environment", "nodes", "links", "services", "faults", "healing"]
    missing = [section for section in required_sections if section not in raw]
    if missing:
        raise ValueError(f"Scenario is missing required sections: {', '.join(missing)}")

    scenario_meta = raw["scenario"]
    nodes = [NodeConfig(**item) for item in raw["nodes"]]
    links = [LinkConfig(**item) for item in raw["links"]]
    services = [ServiceConfig(**item) for item in raw["services"]]
    faults = [FaultConfig(**item) for item in raw["faults"].get("schedule", [])]
    technical_indicators = [
        TechnicalIndicatorConfig(**item) for item in raw.get("technical_indicators", [])
    ]

    node_ids = {node.id for node in nodes}
    service_ids: set[str] = set()
    for link in links:
        if link.source not in node_ids or link.target not in node_ids:
            raise ValueError(f"Link {link.source}->{link.target} references an unknown node")
    for service in services:
        if service.id in service_ids:
            raise ValueError(f"Service {service.id} has a duplicate id")
        service_ids.add(service.id)
        if service.source not in node_ids or service.target not in node_ids:
            raise ValueError(f"Service {service.id} references an unknown node")

    project_root = _find_project_root(Path(__file__).resolve())
    resolved_base_dir = Path(base_dir).resolve() if base_dir is not None else project_root

    return Scenario(
        name=scenario_meta["name"],
        duration_s=float(scenario_meta.get("duration_s", 0)),
        random_seed=int(scenario_meta.get("random_seed", 0)),
        environment=dict(raw["environment"]),
        model_parameters=dict(raw.get("model_parameters", {})),
        nodes=nodes,
        links=links,
        services=services,
        faults_enabled=list(raw["faults"].get("enabled", [])),
        faults=faults,
        healing_enabled=list(raw["healing"].get("enabled", [])),
        technical_indicators=technical_indicators,
        fault_propagation=dict(raw.get("fault_propagation", {})),
        base_dir=resolved_base_dir,
        project_root=project_root,
        raw=raw,
    )


def _find_project_root(start: Path) -> Path:
    for candidate in [start, *start.parents]:
        if (candidate / "lunar_comm_sim").exists() and (candidate / "configs").exists():
            return candidate
    return Path.cwd().resolve()
