"""Generate final delivery Markdown documents from current demo outputs."""

from __future__ import annotations

import csv
import platform
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC_DIR = ROOT / "docs" / "final_delivery"
FINAL_DEMO_REL = Path("outputs/final_demo/demo_run")
FALLBACK_DEMO_REL = Path("outputs/demo_run")


def main() -> None:
    DOC_DIR.mkdir(parents=True, exist_ok=True)
    _write("final_mvp_summary.md", final_mvp_summary())
    _write("research_task_mapping.md", research_task_mapping())
    _write("software_function_list.md", software_function_list())
    _write("indicator_verification_report.md", indicator_verification_report())
    _write("demo_script_for_customer.md", demo_script_for_customer())
    _write("model_assumption_and_limitations.md", model_assumption_and_limitations())
    (ROOT / "MANIFEST.md").write_text(manifest(), encoding="utf-8")


def _write(name: str, content: str) -> None:
    (DOC_DIR / name).write_text(content.strip() + "\n", encoding="utf-8")


def resolve_demo_output_dir(root: Path = ROOT) -> Path | None:
    for rel_path in [FINAL_DEMO_REL, FALLBACK_DEMO_REL]:
        candidate = root / rel_path
        if (candidate / "indicator_check.csv").exists():
            return candidate
    return None


def _read_indicator_rows(root: Path = ROOT) -> tuple[Path | None, list[dict[str, str]]]:
    demo_dir = resolve_demo_output_dir(root)
    if demo_dir is None:
        return None, []
    path = demo_dir / "indicator_check.csv"
    if not path.exists():
        return demo_dir, []
    with path.open("r", encoding="utf-8", newline="") as handle:
        return demo_dir, list(csv.DictReader(handle))


def _classify_method(method: str) -> str:
    lower = method.lower()
    if "physical model" in lower or "reference" in lower:
        return "MVP internal reference"
    if "benchmark" in lower or "library" in lower:
        return "MVP benchmark"
    return "simulation-driven"


def final_mvp_summary() -> str:
    return """
# Final MVP Summary

## MVP Goal

This MVP evaluates resilience and self-healing behavior for a lunar-surface communication network through a traceable software loop: scenario configuration, topology construction, explicit service routing, fault injection, healing strategy execution, layered metric calculation, indicator checking, batch experiments, and report generation.

## Out of Scope

The MVP does not implement a real 5G protocol stack, high-fidelity electromagnetic propagation, real radio hardware control, orbital dynamics, or full packet-level network emulation. It is a research software scaffold for validating closed-loop evaluation logic and metric traceability.

## Implemented Minimum Closed Loop

`nominal_graph -> nominal_routes -> apply_faults -> faulted_graph with inherited routes -> apply_healing -> healed_graph with rerouted routes -> simulate_services -> calculate_metrics -> indicator_check`

The loop writes three-phase outputs for nominal, before-healing, and after-healing states, including route tables, service results, fault events, healing actions, metrics, indicator checks, topology figures, and Markdown reports.

## Research Content Mapping

The four research contents are mapped to software modules covering environmental influence modeling, layered indicator construction, lunar-specific fault propagation modeling, and resilient self-healing policy evaluation. See `research_task_mapping.md` for the module-level mapping.

## Verifiable Technical Indicators

The current demo verifies 14 technical indicators through a mixture of simulation-driven outputs, internal replaceable reference curves, and MVP benchmark checks. The authoritative final acceptance values are generated in `outputs/final_demo/demo_run/indicator_check.csv`, with `outputs/demo_run/indicator_check.csv` used only as a fallback during local development.

## MVP Simplifying Assumptions

The link, service, propagation, and physical-layer models are intentionally lightweight. RF lifetime and dust gain loss use packaged reference CSV curves. Fault propagation uses a rule-driven graph. Service flows are service-level abstractions rather than full protocol traffic.

## Upgrade Path

Future research versions can replace the internal reference curves with literature or lab data, upgrade propagation prediction to Bayesian networks or dynamic fault trees, connect higher-fidelity channel models, and add calibrated data from lunar communication studies or hardware-in-the-loop experiments.
"""


def research_task_mapping() -> str:
    return """
# Research Task Mapping

| Research Content | Software Modules | Primary Outputs | Verification Role |
| --- | --- | --- | --- |
| 1. Modeling influence factors for lunar communication network availability | `environment.py`, `link_model.py`, `physical_models.py`, `data/baselines` | `physical_model_validation.csv`, `physical_model_metrics.csv`, physical-layer rows in `metrics_summary.csv` | Models dust, radiation, temperature, Ka channel availability, RF lifetime, and antenna gain loss assumptions |
| 2. Building a layered availability indicator system | `metrics.py`, `configs/default_scenario.yaml` `technical_indicators`, `indicator_check.csv` | `metrics_summary.csv`, `indicator_check.csv` | Converts simulated and benchmark metrics into pass/fail/not-applicable technical indicator checks |
| 3. Analyzing and modeling lunar-environment-specific fault modes and propagation | `faults.py`, `propagation.py` | `fault_events.csv`, `fault_propagation_predictions.csv`, `observed_impacts.csv`, `fault_propagation_comparison.csv` | Captures main-hub failure, dust degradation, handover delay, congestion, radiation CPU lock, and propagation prediction accuracy |
| 4. Researching fault-tolerant self-healing strategies for lunar communication networks | `healing.py`, `routing.py`, `services.py` | `healing_actions.csv`, `service_routes.csv`, `service_results.csv` | Evaluates rerouting, priority scheduling, service degradation, store-and-forward, and relay pre-handover effects |
"""


def software_function_list() -> str:
    return """
# Software Function List

- Scenario configuration through YAML files.
- Topology construction from configured nodes and links.
- Explicit service routing and three-phase route export.
- Environmental influence modeling for dust, radiation, temperature, and handover conditions.
- Fault injection for lunar-network failure modes.
- Fault propagation prediction and observed-impact comparison.
- Self-healing strategy execution and action logging.
- Layered metric evaluation across physical, network, service, and fault layers.
- Technical indicator acceptance table generation.
- Monte Carlo experiments.
- Parameter sweep experiments.
- Healing strategy ablation experiments.
- Streamlit Dashboard display.
- Automatic CSV, PNG, and Markdown report output.
"""


def indicator_verification_report(root: Path = ROOT) -> str:
    demo_dir, rows = _read_indicator_rows(root)
    source_text = (
        f"`{demo_dir.relative_to(root).as_posix()}/indicator_check.csv`"
        if demo_dir is not None and demo_dir.is_relative_to(root)
        else "`outputs/final_demo/demo_run/indicator_check.csv`"
    )
    lines = [
        "# Indicator Verification Report",
        "",
        f"This report is generated from {source_text}.",
        "",
        f"Actual demo output directory: `{demo_dir.relative_to(root).as_posix() if demo_dir is not None and demo_dir.is_relative_to(root) else 'not found'}`.",
        "",
        "| Indicator | Threshold | Demo Actual | Status | Verification Method | Output File | Evidence Type |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in rows:
        threshold = f"{row.get('operator', '')} {row.get('threshold', '')} {row.get('unit', '')}".strip()
        actual = f"{row.get('actual', '')} {row.get('unit', '')}".strip()
        method = row.get("verification_method", "")
        lines.append(
            "| {indicator} | {threshold} | {actual} | {status} | {method} | `indicator_check.csv` / `metrics_summary.csv` | {kind} |".format(
                indicator=row.get("indicator", row.get("id", "")),
                threshold=threshold,
                actual=actual,
                status=row.get("status", ""),
                method=method,
                kind=_classify_method(method),
            )
        )
    if not rows:
        lines.append("| No demo indicator rows found | - | - | missing | Run `python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/final_demo/demo_run` first | - | - |")
    return "\n".join(lines)


def demo_script_for_customer() -> str:
    return """
# Demo Script for Customer

## 1. Project Goal

This software demonstrates a minimum closed-loop resilience evaluation tool for lunar-surface communication networks. The emphasis is traceable evaluation and self-healing verification, not a full communication protocol stack.

## 2. Lunar Communication Topology

Open `outputs/final_demo/demo_run/topology_nominal.png` or the Dashboard. Explain the ground station, lunar orbiter, lander hub, rover, relay, and backup surface links.

## 3. Route Failure Before Healing

Show `service_routes.csv` and compare `nominal` with `before_healing`. Highlight that before healing the inherited nominal route can fail after main-hub failure; the simulator does not silently recompute shortest paths.

## 4. Self-Healing Recovery

Show `healing_actions.csv` and `topology_after.png`. Explain how rerouting, priority scheduling, service degradation, store-and-forward, and relay pre-handover contribute to recovery.

## 5. Fourteen Indicator Checks

Open `indicator_check.csv` or the Dashboard indicator tab. Explain passed, failed, and not-applicable statuses, the thresholds, and the verification method for each indicator.

## 6. Batch Experiments

Show experiment outputs under `outputs/final_demo/experiments`, including healing ablation, isolated dust sweep, relay handover sweep, and fast Monte Carlo. Emphasize that batch experiments test whether conclusions remain stable under parameter changes.

## 7. Dashboard

Run `streamlit run lunar_comm_sim/app/dashboard.py`. The Dashboard reads `outputs/final_demo/demo_run` by default and falls back to `outputs/demo_run`.

## 8. MVP Assumptions and Extension Path

Close by explaining that RF lifetime and dust gain use replaceable packaged reference curves, propagation uses a rule-driven graph, links are abstract links, and service flows are service-level abstractions. Future versions can replace these with calibrated literature, lab, or high-fidelity simulation data.
"""


def model_assumption_and_limitations() -> str:
    return """
# Model Assumptions and Limitations

- RF lifetime validation uses an MVP built-in replaceable reference curve in `data/baselines/rf_lifetime_reference.csv`.
- Dust gain loss validation uses an MVP built-in replaceable reference curve in `data/baselines/dust_gain_reference.csv`.
- The propagation graph is an MVP rule-based propagation model. It can later be upgraded to a Bayesian network, dynamic fault tree, or data-driven propagation model.
- The link model is an abstract link model, not a real 5G protocol stack.
- Service flows are packet-level or service-level abstractions, not complete network protocol simulations.
- Ka-channel availability currently uses configured and active-path availability definitions documented in the model assumptions and demo reports.
- Monte Carlo and sweep experiments validate sensitivity and repeatability, but their distributions remain configurable MVP assumptions until calibrated with external data.
"""


def manifest() -> str:
    return f"""
# Delivery Manifest

- Project: Lunar Comm Resilience MVP
- Version: MVP v1.0-final
- Generated date: {date.today().isoformat()}
- Python version: {platform.python_version()}
- Main dependencies: numpy, pandas, networkx, simpy, pydantic, pyyaml, matplotlib, plotly, streamlit, typer, rich, pytest

## Core Directories

- `configs/`: default scenario and experiment YAML files.
- `data/baselines/`: packaged RF lifetime and dust gain reference CSV files.
- `docs/`: model notes, round notes, and final delivery documents.
- `lunar_comm_sim/`: simulator package, CLI, Dashboard, core models, and experiments.
- `scripts/`: setup, acceptance, package, and delivery verification scripts.
- `tests/`: pytest regression tests.
- `outputs/final_demo/`: final acceptance demo and experiment outputs.

## Required Data Files

- `data/baselines/rf_lifetime_reference.csv`
- `data/baselines/dust_gain_reference.csv`

## Main Commands

- `python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/demo_run`
- `python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/healing_ablation.yaml --out outputs/experiments/healing_ablation`
- `streamlit run lunar_comm_sim/app/dashboard.py`
- `scripts/run_final_acceptance.bat`
- `powershell -ExecutionPolicy Bypass -File scripts/package_final_delivery.ps1`

## Main Outputs

- `indicator_check.csv`
- `metrics_summary.csv`
- `service_routes.csv`
- `service_results.csv`
- `healing_actions.csv`
- `fault_propagation_metrics.csv`
- `physical_model_validation.csv`
- `report.md`

## Tested Scope

- Passed test count: generated from the latest local pytest run during final acceptance.
- Current local check target: `pytest -q` and `python -m pytest -q`.

## Current Limitations

This package is an MVP research scaffold. It does not implement a real 5G stack, high-fidelity electromagnetic simulation, orbital mechanics, hardware-in-the-loop testing, or calibrated operational lunar mission data.
"""


if __name__ == "__main__":
    main()
