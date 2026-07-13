from lunar_comm_sim.sim.engine import run_simulation
from scripts.generate_final_delivery_docs import main as generate_final_delivery_docs
from scripts.verify_delivery_package import verify


def test_verify_delivery_package_ready_after_final_demo_generation(tmp_path):
    run_simulation("configs/default_scenario.yaml", "outputs/final_demo/demo_run")
    generate_final_delivery_docs()

    result = verify()

    assert result["delivery_ready"] is True
    assert result["missing_files"] == []
    assert result["warnings"] == []
