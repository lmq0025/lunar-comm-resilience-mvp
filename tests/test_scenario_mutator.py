from lunar_comm_sim.experiments.scenario_mutator import (
    load_raw_scenario,
    set_dust_level,
    set_healing_enabled,
    set_relay_handover_extra_delay_ms,
)


def test_scenario_mutator_changes_expected_fields():
    raw = load_raw_scenario("configs/default_scenario.yaml")

    dusty = set_dust_level(raw, 0.9)
    assert dusty["environment"]["dust_level"] == 0.9
    assert raw["environment"]["dust_level"] != 0.9

    handover = set_relay_handover_extra_delay_ms(raw, 180)
    assert handover["environment"]["relay_handover"]["handover_extra_delay_ms"] == 180

    healing = set_healing_enabled(raw, ["reroute_backup_path"])
    assert healing["healing"]["enabled"] == ["reroute_backup_path"]
