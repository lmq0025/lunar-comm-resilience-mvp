import csv

from lunar_comm_sim.sim.engine import run_simulation


def test_indicator_check_contains_applicability_status_fields(tmp_path):
    run_simulation("configs/default_scenario.yaml", tmp_path)
    with (tmp_path / "indicator_check.csv").open("r", encoding="utf-8") as handle:
        row = next(csv.DictReader(handle))

    assert "applicable" in row
    assert "status" in row
    assert "not_applicable_reason" in row
