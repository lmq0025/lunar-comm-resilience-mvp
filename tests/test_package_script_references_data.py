from pathlib import Path


def test_package_script_references_data_and_baseline_checks():
    script = Path("scripts/package_final_delivery.ps1").read_text(encoding="utf-8")

    assert '"data"' in script
    assert '"MANIFEST.md"' in script
    assert "data/baselines/rf_lifetime_reference.csv" in script
    assert "data/baselines/dust_gain_reference.csv" in script
