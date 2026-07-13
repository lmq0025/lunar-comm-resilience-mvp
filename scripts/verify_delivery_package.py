"""Verify that the final delivery package contains required files."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "README.md",
    "MANIFEST.md",
    "PROJECT_BRIEF.md",
    "requirements.txt",
    "environment.yml",
    "configs/default_scenario.yaml",
    "data/baselines/rf_lifetime_reference.csv",
    "data/baselines/dust_gain_reference.csv",
    "lunar_comm_sim/core/physical_models.py",
    "lunar_comm_sim/core/propagation.py",
    "lunar_comm_sim/app/dashboard.py",
    "docs/final_delivery/final_mvp_summary.md",
    "docs/final_delivery/indicator_verification_report.md",
    "outputs/final_demo/demo_run/indicator_check.csv",
    "outputs/final_demo/demo_run/physical_model_validation.csv",
    "outputs/final_demo/demo_run/fault_propagation_metrics.csv",
]


def verify(root: Path = ROOT) -> dict[str, object]:
    existing = [path for path in REQUIRED_FILES if (root / path).exists()]
    missing = [path for path in REQUIRED_FILES if not (root / path).exists()]
    warnings = _warnings(root)
    return {
        "existing_files": existing,
        "missing_files": missing,
        "warnings": warnings,
        "delivery_ready": not missing and not warnings,
    }


def _warnings(root: Path) -> list[str]:
    warnings: list[str] = []
    indicator_report = root / "docs/final_delivery/indicator_verification_report.md"
    if indicator_report.exists():
        content = indicator_report.read_text(encoding="utf-8")
        if "No demo indicator rows found" in content:
            warnings.append(
                "docs/final_delivery/indicator_verification_report.md has no demo indicator rows. Run final demo and regenerate final delivery docs."
            )
    return warnings


def main() -> int:
    result = verify()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["delivery_ready"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
