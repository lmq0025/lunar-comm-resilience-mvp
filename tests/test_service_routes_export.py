import csv

from lunar_comm_sim.sim.engine import run_simulation


def test_service_routes_csv_contains_three_phase_path_changes(tmp_path):
    run_simulation("configs/default_scenario.yaml", tmp_path)

    route_path = tmp_path / "service_routes.csv"
    assert route_path.exists()

    rows = list(csv.DictReader(route_path.open("r", encoding="utf-8")))
    phases = {row["phase"] for row in rows}
    assert {"nominal", "before_healing", "after_healing"} <= phases

    by_phase = {
        row["phase"]: row
        for row in rows
        if row["service_id"] == "control_command"
    }
    assert by_phase["nominal"]["path"] == by_phase["before_healing"]["path"]
    assert by_phase["before_healing"]["valid"] == "False"
    assert by_phase["after_healing"]["valid"] == "True"
    assert by_phase["after_healing"]["path"] != by_phase["before_healing"]["path"]
