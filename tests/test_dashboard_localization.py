from pathlib import Path

import pandas as pd
import yaml

from lunar_comm_sim.app.dashboard import localize_dataframe
from lunar_comm_sim.sim.engine import run_simulation


def test_dashboard_no_use_container_width_argument():
    dashboard_source = Path("lunar_comm_sim/app/dashboard.py").read_text(encoding="utf-8")

    assert "use_container_width" not in dashboard_source


def test_localize_dataframe_does_not_mutate_source_dataframe():
    raw = pd.DataFrame(
        [
            {
                "phase": "before_healing",
                "status": "passed",
                "service_id": "control_command",
                "strategy": "reroute_backup_path",
                "path": "ground_station -> lunar_orbiter -> lander_main_hub",
            }
        ]
    )
    original = raw.copy(deep=True)

    localized = localize_dataframe(raw)

    pd.testing.assert_frame_equal(raw, original)
    assert "阶段" in localized.columns
    assert localized.loc[0, "阶段"] == "故障后、自愈前"
    assert localized.loc[0, "状态"] == "通过"
    assert localized.loc[0, "业务"] == "控制指令"
    assert localized.loc[0, "自愈策略"] == "备用路径重路由"
    assert localized.loc[0, "路径"] == "地球地面站 -> 月轨中继器 -> 月面主枢纽"


def test_internal_yaml_and_csv_identifiers_remain_unchanged(tmp_path):
    raw = yaml.safe_load(Path("configs/default_scenario.yaml").read_text(encoding="utf-8"))
    service_ids = {service["id"] for service in raw["services"]}
    healing_ids = set(raw["healing"]["enabled"])

    assert {"control_command", "science_data", "hd_video", "teleoperation"} <= service_ids
    assert "reroute_backup_path" in healing_ids

    run_simulation("configs/default_scenario.yaml", tmp_path)
    service_routes = pd.read_csv(tmp_path / "service_routes.csv")
    indicator_check = pd.read_csv(tmp_path / "indicator_check.csv")

    assert "service_id" in service_routes.columns
    assert "route_source" in service_routes.columns
    assert "metric" in indicator_check.columns
    assert "control_command" in set(service_routes["service_id"])
    assert "route_convergence_time_ms" in set(indicator_check["metric"])
