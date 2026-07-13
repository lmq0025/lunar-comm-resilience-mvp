from pathlib import Path

from scripts.generate_final_delivery_docs import indicator_verification_report, resolve_demo_output_dir


def _write_indicator(path: Path, indicator: str) -> None:
    path.mkdir(parents=True, exist_ok=True)
    (path / "indicator_check.csv").write_text(
        "\n".join(
            [
                "id,indicator,layer,metric,operator,threshold,actual,unit,applicable,status,not_applicable_reason,passed,verification_method",
                f"demo,{indicator},service,demo_metric,>=,1,1,ratio,True,passed,,True,unit test",
            ]
        ),
        encoding="utf-8",
    )


def test_final_delivery_docs_prefer_final_demo_output(tmp_path):
    final_demo = tmp_path / "outputs" / "final_demo" / "demo_run"
    fallback_demo = tmp_path / "outputs" / "demo_run"
    _write_indicator(final_demo, "Final demo indicator")
    _write_indicator(fallback_demo, "Fallback demo indicator")

    report = indicator_verification_report(tmp_path)

    assert resolve_demo_output_dir(tmp_path) == final_demo
    assert "outputs/final_demo/demo_run/indicator_check.csv" in report
    assert "Final demo indicator" in report
    assert "Fallback demo indicator" not in report


def test_final_delivery_docs_show_prompt_when_no_demo_exists(tmp_path):
    report = indicator_verification_report(tmp_path)

    assert "Actual demo output directory: `not found`" in report
    assert "No demo indicator rows found" in report
