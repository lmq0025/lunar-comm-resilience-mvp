"""End-to-end MVP simulation engine."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from lunar_comm_sim.core.faults import apply_faults, fault_records_as_rows
from lunar_comm_sim.core.healing import apply_healing, healing_actions_as_rows
from lunar_comm_sim.core.metrics import build_indicator_checks, calculate_metrics
from lunar_comm_sim.core.physical_models import physical_model_metrics_as_rows, validate_physical_models
from lunar_comm_sim.core.propagation import (
    calculate_propagation_metrics,
    compare_propagation_prediction,
    extract_observed_impacts,
    predict_fault_propagation,
    propagation_metrics_as_rows,
)
from lunar_comm_sim.core.reporting import write_csv, write_report
from lunar_comm_sim.core.routing import build_routing_table, service_routes_as_rows
from lunar_comm_sim.core.scenario import Scenario, load_scenario, load_scenario_from_dict
from lunar_comm_sim.core.services import service_results_as_rows, simulate_services
from lunar_comm_sim.core.topology import build_topology, draw_topology


REQUIRED_OUTPUTS = [
    "metrics_summary.csv",
    "indicator_check.csv",
    "fault_events.csv",
    "healing_actions.csv",
    "service_results.csv",
    "service_routes.csv",
    "fault_propagation_predictions.csv",
    "observed_impacts.csv",
    "fault_propagation_comparison.csv",
    "fault_propagation_metrics.csv",
    "physical_model_validation.csv",
    "physical_model_metrics.csv",
    "topology_nominal.png",
    "topology_before.png",
    "topology_after.png",
    "report.md",
]


def run_simulation(scenario_path: str | Path | dict[str, Any] | Scenario, output_dir: str | Path, write_artifacts: bool = True) -> dict[str, Any]:
    """Run the full MVP loop and write all required artifacts."""

    scenario = _coerce_scenario(scenario_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    physical_model_metrics, physical_model_validation_rows = validate_physical_models(scenario)

    nominal_graph = build_topology(scenario)
    nominal_graph.graph["stage"] = "nominal"
    nominal_graph.graph["service_routes"] = build_routing_table(
        nominal_graph,
        scenario,
        recompute=True,
        route_source="nominal_computed",
    )
    faulted_graph, fault_records = apply_faults(nominal_graph, scenario)
    faulted_graph.graph["service_routes"] = build_routing_table(
        faulted_graph,
        scenario,
        recompute=False,
        inherited_routes=nominal_graph.graph["service_routes"],
        route_source="inherited_nominal",
    )
    healed_graph, healing_actions = apply_healing(faulted_graph, scenario)

    nominal_services = simulate_services(nominal_graph, scenario, phase="nominal")
    before_services = simulate_services(faulted_graph, scenario, phase="before_healing")
    after_services = simulate_services(healed_graph, scenario, phase="after_healing")

    nominal_metrics = calculate_metrics(
        nominal_graph,
        scenario,
        nominal_services,
        phase="nominal",
        physical_model_metrics=physical_model_metrics,
    )
    before_metrics = calculate_metrics(
        faulted_graph,
        scenario,
        before_services,
        phase="before_healing",
        physical_model_metrics=physical_model_metrics,
    )
    after_metrics = calculate_metrics(healed_graph, scenario, after_services, phase="after_healing")

    fault_rows = fault_records_as_rows(fault_records)
    healing_rows = healing_actions_as_rows(healing_actions)
    service_route_rows = (
        service_routes_as_rows(nominal_graph, scenario, "nominal")
        + service_routes_as_rows(faulted_graph, scenario, "before_healing")
        + service_routes_as_rows(healed_graph, scenario, "after_healing")
    )
    preliminary_metrics = nominal_metrics + before_metrics + after_metrics
    propagation_predictions = predict_fault_propagation(fault_records, scenario)
    observed_impacts = extract_observed_impacts(
        fault_records,
        nominal_services + before_services + after_services,
        preliminary_metrics,
        service_route_rows,
        scenario,
    )
    propagation_comparison = compare_propagation_prediction(propagation_predictions, observed_impacts)
    propagation_metrics = calculate_propagation_metrics(propagation_comparison) if scenario.fault_propagation.get("enabled", False) else {}

    after_metrics = calculate_metrics(
        healed_graph,
        scenario,
        after_services,
        phase="after_healing",
        propagation_metrics=propagation_metrics,
        physical_model_metrics=physical_model_metrics,
    )
    all_metrics = nominal_metrics + before_metrics + after_metrics
    indicators = build_indicator_checks(after_metrics, scenario)

    if write_artifacts:
        draw_topology(nominal_graph, out_dir / "topology_nominal.png", "正常状态网络拓扑")
        draw_topology(faulted_graph, out_dir / "topology_before.png", "故障后、自愈前网络拓扑")
        draw_topology(healed_graph, out_dir / "topology_after.png", "自愈后网络拓扑")

        write_csv(out_dir / "metrics_summary.csv", all_metrics)
        write_csv(out_dir / "indicator_check.csv", indicators)
        write_csv(out_dir / "fault_events.csv", fault_rows)
        write_csv(out_dir / "healing_actions.csv", healing_rows)
        write_csv(out_dir / "service_results.csv", service_results_as_rows(nominal_services + before_services + after_services))
        write_csv(out_dir / "service_routes.csv", service_route_rows)
        write_csv(out_dir / "fault_propagation_predictions.csv", propagation_predictions)
        write_csv(out_dir / "observed_impacts.csv", observed_impacts)
        write_csv(out_dir / "fault_propagation_comparison.csv", propagation_comparison)
        write_csv(out_dir / "fault_propagation_metrics.csv", propagation_metrics_as_rows(propagation_metrics))
        write_csv(out_dir / "physical_model_validation.csv", physical_model_validation_rows)
        write_csv(out_dir / "physical_model_metrics.csv", physical_model_metrics_as_rows(physical_model_metrics))
        write_report(
            out_dir / "report.md",
            scenario,
            all_metrics,
            indicators,
            REQUIRED_OUTPUTS,
            fault_rows=fault_rows,
            healing_rows=healing_rows,
            service_route_rows=service_route_rows,
            propagation_predictions=propagation_predictions,
            observed_impacts=observed_impacts,
            propagation_comparison=propagation_comparison,
            propagation_metrics=propagation_metrics,
            physical_model_validation_rows=physical_model_validation_rows,
            physical_model_metrics=physical_model_metrics,
        )

    return {
        "scenario": scenario,
        "output_dir": out_dir,
        "metrics": all_metrics,
        "indicators": indicators,
        "faults": fault_records,
        "healing_actions": healing_actions,
        "services": nominal_services + before_services + after_services,
        "routes": {
            "nominal": nominal_graph.graph.get("service_routes", {}),
            "before_healing": faulted_graph.graph.get("service_routes", {}),
            "after_healing": healed_graph.graph.get("service_routes", {}),
        },
        "propagation_predictions": propagation_predictions,
        "observed_impacts": observed_impacts,
        "propagation_comparison": propagation_comparison,
        "propagation_metrics": propagation_metrics,
        "physical_model_validation": physical_model_validation_rows,
        "physical_model_metrics": physical_model_metrics,
        "required_outputs": [out_dir / name for name in REQUIRED_OUTPUTS],
    }


def _coerce_scenario(scenario_input: str | Path | dict[str, Any] | Scenario) -> Scenario:
    if isinstance(scenario_input, Scenario):
        return scenario_input
    if isinstance(scenario_input, dict):
        return load_scenario_from_dict(scenario_input)
    return load_scenario(scenario_input)
