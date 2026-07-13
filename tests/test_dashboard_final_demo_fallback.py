from pathlib import Path

from lunar_comm_sim.app.dashboard import resolve_demo_output_dir, resolve_experiment_base_dir


def test_dashboard_defaults_to_final_demo_when_present(tmp_path):
    preferred = tmp_path / "outputs" / "final_demo" / "demo_run"
    fallback = tmp_path / "outputs" / "demo_run"
    preferred.mkdir(parents=True)
    fallback.mkdir(parents=True)
    (preferred / "metrics_summary.csv").write_text("phase,metric,value\n", encoding="utf-8")

    assert resolve_demo_output_dir(preferred, fallback) == preferred


def test_dashboard_falls_back_to_demo_run_when_final_demo_missing(tmp_path):
    preferred = tmp_path / "outputs" / "final_demo" / "demo_run"
    fallback = tmp_path / "outputs" / "demo_run"
    fallback.mkdir(parents=True)

    assert resolve_demo_output_dir(preferred, fallback) == fallback


def test_dashboard_experiment_base_prefers_final_demo_and_falls_back(tmp_path):
    preferred = tmp_path / "outputs" / "final_demo" / "experiments"
    fallback = tmp_path / "outputs" / "experiments"
    fallback.mkdir(parents=True)

    assert resolve_experiment_base_dir(preferred, fallback) == fallback

    preferred.mkdir(parents=True)

    assert resolve_experiment_base_dir(preferred, fallback) == preferred
