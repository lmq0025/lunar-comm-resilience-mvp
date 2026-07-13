
# Delivery Manifest

- Project: Lunar Comm Resilience MVP
- Version: MVP v1.0-final
- Generated date: 2026-07-13
- Python version: 3.11.15
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
