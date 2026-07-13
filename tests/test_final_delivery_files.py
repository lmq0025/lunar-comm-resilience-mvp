from pathlib import Path


def test_final_delivery_documents_and_manifest_exist():
    required = [
        Path("docs/final_delivery/final_mvp_summary.md"),
        Path("docs/final_delivery/research_task_mapping.md"),
        Path("docs/final_delivery/software_function_list.md"),
        Path("docs/final_delivery/indicator_verification_report.md"),
        Path("docs/final_delivery/demo_script_for_customer.md"),
        Path("docs/final_delivery/model_assumption_and_limitations.md"),
        Path("data/baselines/rf_lifetime_reference.csv"),
        Path("data/baselines/dust_gain_reference.csv"),
        Path("MANIFEST.md"),
    ]

    missing = [path for path in required if not path.exists()]

    assert missing == []
