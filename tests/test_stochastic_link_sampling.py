import random

from lunar_comm_sim.experiments.scenario_mutator import load_raw_scenario
from lunar_comm_sim.experiments.stochastic import apply_stochastic_realization


def test_stochastic_link_sampling_respects_availability_extremes():
    raw = load_raw_scenario("configs/default_scenario.yaml")
    for link in raw["links"]:
        if link["kind"] == "redundant_surface":
            link["availability"] = 0.0
        if link["kind"] == "surface_to_orbit":
            link["availability"] = 1.0

    realized, events = apply_stochastic_realization(
        raw,
        random.Random(7),
        {
            "enabled": True,
            "link_failure_sampling": True,
            "sampled_link_kinds": ["redundant_surface", "surface_to_orbit"],
        },
    )

    redundant = [link for link in realized["links"] if link["kind"] == "redundant_surface"]
    surface_to_orbit = [link for link in realized["links"] if link["kind"] == "surface_to_orbit"]
    assert all(link["active"] is False for link in redundant)
    assert all(link["active"] is True for link in surface_to_orbit)
    assert events["stochastic_failed_link_count"] == len(redundant)
