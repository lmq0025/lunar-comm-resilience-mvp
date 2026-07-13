from pathlib import Path

import yaml

from lunar_comm_sim.experiments.scenario_mutator import apply_mutations, load_raw_scenario
from lunar_comm_sim.sim.engine import run_simulation


def test_route_convergence_not_applicable_when_main_hub_fault_disabled(tmp_path):
    raw = apply_mutations(
        load_raw_scenario("configs/default_scenario.yaml"),
        {
            "dust_level": 0.5,
            "disable_fault_types": ["main_hub_failure", "buffer_overflow", "relay_handover_delay"],
        },
    )
    result = run_simulation(raw, tmp_path / "isolated")
    route_indicator = next(row for row in result["indicators"] if row["id"] == "route_convergence")

    assert route_indicator["applicable"] is False
    assert route_indicator["status"] == "not_applicable"


def test_route_convergence_applicable_and_passed_in_default_demo(tmp_path):
    result = run_simulation("configs/default_scenario.yaml", tmp_path / "demo")
    route_indicator = next(row for row in result["indicators"] if row["id"] == "route_convergence")

    assert route_indicator["applicable"] is True
    assert route_indicator["status"] == "passed"
