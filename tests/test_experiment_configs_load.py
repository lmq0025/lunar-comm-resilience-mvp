from pathlib import Path

import yaml


def test_experiment_configs_load():
    paths = sorted(Path("configs/experiments").glob("*.yaml"))
    assert paths
    for path in paths:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        assert data["experiment"]["name"]
        assert data["experiment"]["type"] in {"monte_carlo", "sweep", "ablation"}
