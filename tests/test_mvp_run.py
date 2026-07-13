from pathlib import Path

from lunar_comm_sim.sim.engine import REQUIRED_OUTPUTS, run_simulation


def test_full_mvp_run_generates_required_artifacts(tmp_path: Path):
    result = run_simulation("configs/default_scenario.yaml", tmp_path)

    for filename in REQUIRED_OUTPUTS:
        artifact = tmp_path / filename
        assert artifact.exists(), filename
        assert artifact.stat().st_size > 0, filename

    assert len(result["services"]) == 12
    assert result["healing_actions"]
    assert all(row["passed"] for row in result["indicators"])
