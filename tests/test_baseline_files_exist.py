from pathlib import Path


def test_physical_baseline_files_exist_and_are_nonempty():
    baseline_dir = Path("data/baselines")
    rf_path = baseline_dir / "rf_lifetime_reference.csv"
    dust_path = baseline_dir / "dust_gain_reference.csv"

    assert rf_path.exists()
    assert dust_path.exists()
    assert rf_path.stat().st_size > 0
    assert dust_path.stat().st_size > 0
