from pathlib import Path

import yaml

from lunar_comm_sim.sim.engine import run_simulation


def test_bad_topology_does_not_force_all_indicators_to_pass(tmp_path: Path):
    data = yaml.safe_load(Path("configs/default_scenario.yaml").read_text(encoding="utf-8"))
    backup_edges = {
        ("rover_1", "relay_backup_1"),
        ("rover_2", "relay_backup_2"),
        ("teleop_terminal", "relay_backup_2"),
        ("science_station", "relay_backup_1"),
        ("camera_station", "relay_backup_2"),
        ("edge_compute", "relay_backup_1"),
    }
    data["links"] = [
        link
        for link in data["links"]
        if (link["source"], link["target"]) not in backup_edges and (link["target"], link["source"]) not in backup_edges
    ]
    path = tmp_path / "bad_topology.yaml"
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")

    result = run_simulation(path, tmp_path / "bad")

    assert any(not row["passed"] for row in result["indicators"])
    assert any(row["metric"] == "subnet_paralysis_probability" and not row["passed"] for row in result["indicators"])
