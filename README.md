# Lunar Comm Resilience MVP

Python MVP for lunar-surface communication network resilience evaluation, self-healing simulation, batch experiments, and final delivery reporting.

## Project Scope

This project validates a minimum closed-loop workflow:

`scenario configuration -> topology construction -> explicit service routing -> fault injection -> self-healing -> service simulation -> layered metrics -> indicator checks -> reports`

The MVP does not implement a real 5G protocol stack or high-fidelity electromagnetic simulation. It provides traceable research software for availability, resilience, and self-healing evaluation.

## Current MVP Functions

- YAML scenario configuration.
- Lunar communication topology construction.
- Explicit service routes for nominal, before-healing, and after-healing phases.
- Environmental influence modeling and packaged physical reference curves.
- Fault injection and fault propagation prediction.
- Self-healing strategies and action logs.
- Layered metrics and 14 technical indicator checks.
- Monte Carlo, parameter sweep, and healing ablation experiments.
- Streamlit Dashboard.
- Automatic CSV, PNG, Markdown, final delivery documents, and package verification scripts.

## Environment

Create the Windows conda environment:

```bat
scripts\setup_env_windows.bat
```

Or run the commands directly:

```bat
conda create -p E:\ProgramData\condaData\envs_dirs\lunar_comm_mvp python=3.11 -y
conda activate E:\ProgramData\condaData\envs_dirs\lunar_comm_mvp
pip install -r requirements.txt
```

## Single Scenario Demo

```bash
python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/demo_run
```

Final acceptance demo output uses:

```bash
python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/final_demo/demo_run
```

## Batch Experiments

Healing ablation:

```bash
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/healing_ablation.yaml --out outputs/experiments/healing_ablation
```

Isolated dust sweep:

```bash
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/dust_sweep_isolated.yaml --out outputs/experiments/dust_sweep_isolated
```

Relay handover sweep:

```bash
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/relay_handover_sweep.yaml --out outputs/experiments/relay_handover_sweep
```

Fast Monte Carlo:

```bash
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/main_hub_monte_carlo_fast.yaml --out outputs/experiments/main_hub_monte_carlo_fast
```

## Dashboard

```bash
streamlit run lunar_comm_sim/app/dashboard.py
```

The Dashboard reads `outputs/final_demo/demo_run` by default. If it does not exist, it falls back to `outputs/demo_run`. Batch experiment tabs read `outputs/final_demo/experiments` by default and fall back to `outputs/experiments`.

## Complete Software Backend API

Start the staged FastAPI backend:

```powershell
scripts\run_api.bat
```

Swagger and health-check URLs:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`
- `http://127.0.0.1:8000/api/v1/health`

The backend exposes nine ordered simulation-step endpoints under `/api/v1/sessions/{session_id}/steps/...`. Session state is currently kept in process memory only.

## Complete Software Frontend

Round 5 opens the complete nine-step staged workflow in the React frontend: topology build, route calculation, nominal simulation, fault injection, before-healing impact analysis, non-routing healing execution, backup-route recalculation, after-healing simulation, and final indicator verification with artifact downloads.

Install frontend dependencies:

```powershell
scripts\install_frontend.bat
```

Start backend and frontend for local development:

```powershell
scripts\run_platform_dev.bat
```

Custom ports are supported:

```powershell
scripts\run_platform_dev.bat 8765 5174
```

This maps the API to `http://127.0.0.1:8765` and the frontend to `http://127.0.0.1:5174`, with `VITE_API_BASE_URL` passed to the frontend automatically.

Frontend URL:

- `http://127.0.0.1:5173`

The frontend currently stores projects in browser `localStorage`, supports YAML/JSON import and export, validates scenarios through the FastAPI backend, configures services, faults, and healing strategies, and runs the full backend-driven nine-step loop. Batch experiment pages remain reserved for later development rounds.

Round 5 engineering notes are in `docs/full_software_round5_healing_and_indicator_verification.md`.

## Final Acceptance

```bat
scripts\run_final_acceptance.bat
```

This script activates the conda environment, runs tests, generates final demo outputs, runs representative experiments, regenerates final delivery documents, and prints the Dashboard command.

## Delivery Package Verification

```bash
python scripts/verify_delivery_package.py
```

The script reports existing files, missing files, and `delivery_ready: true / false`.

## Final Packaging

```powershell
powershell -ExecutionPolicy Bypass -File scripts/package_final_delivery.ps1
```

The package is written to:

`E:\LunarCommMVP\lunar_comm_mvp_final_delivery.zip`

## Directory Structure

- `configs/`: default scenario and batch experiment configurations.
- `data/baselines/`: packaged RF lifetime and dust gain reference CSV files.
- `docs/`: model notes, round notes, and final delivery documents.
- `lunar_comm_sim/`: simulator package, CLI, Dashboard, core models, and experiments.
- `scripts/`: environment setup, acceptance, verification, and packaging scripts.
- `tests/`: pytest regression suite.
- `outputs/demo_run/`: normal single-demo output.
- `outputs/final_demo/`: final acceptance demo and experiment output.

## Packaging Review

```bat
tree /F /A > project_tree.txt
```

The review archive must include:

- `README.md`
- `PROJECT_BRIEF.md`
- `requirements.txt`
- `environment.yml`
- `configs/`
- `data/`
- `data/baselines/`
- `docs/`
- `lunar_comm_sim/`
- `tests/`
- `scripts/`
- `outputs/final_demo/`
- `project_tree.txt`

Important: `data/baselines/rf_lifetime_reference.csv` and `data/baselines/dust_gain_reference.csv` must be delivered with the package.
