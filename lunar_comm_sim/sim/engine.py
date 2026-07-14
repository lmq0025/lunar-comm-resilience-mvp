"""End-to-end MVP simulation engine built on staged simulation steps."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from lunar_comm_sim.core.scenario import Scenario
from lunar_comm_sim.sim.staged_engine import (
    REQUIRED_OUTPUTS,
    coerce_scenario,
    run_all_steps,
    simulation_result,
)


def run_simulation(
    scenario_path: str | Path | dict[str, Any] | Scenario,
    output_dir: str | Path,
    write_artifacts: bool = True,
) -> dict[str, Any]:
    """Run the full MVP loop and write all required artifacts."""

    state = run_all_steps(scenario_path, output_dir=output_dir, write_artifacts=write_artifacts)
    return simulation_result(state)


def _coerce_scenario(scenario_input: str | Path | dict[str, Any] | Scenario) -> Scenario:
    return coerce_scenario(scenario_input)
