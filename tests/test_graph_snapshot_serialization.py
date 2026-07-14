from api_round1_helpers import client, create_session, run_api_steps
from lunar_comm_sim.sim.staged_engine import (
    analyze_fault_impact_step,
    build_topology_step,
    calculate_routes_step,
    create_staged_state,
    execute_healing_step,
    inject_faults_step,
    run_nominal_step,
)
from lunar_comm_sim.sim.snapshots import graph_snapshot


def test_graph_snapshot_contains_required_frontend_fields() -> None:
    state = create_staged_state("configs/default_scenario.yaml")
    result = build_topology_step(state)
    snapshot = result["topology"]
    assert snapshot["stage"] == "nominal"
    assert snapshot["summary"]["node_count"] == 12
    assert snapshot["summary"]["edge_count"] == 20
    node = snapshot["nodes"][0]
    for key in ["id", "name", "type", "role", "active", "availability", "position_x", "position_y", "node_processing_delay_ms"]:
        assert key in node
    link = snapshot["links"][0]
    for key in [
        "id",
        "source",
        "target",
        "kind",
        "active",
        "bandwidth_mbps",
        "base_bandwidth_mbps",
        "delay_ms",
        "base_delay_ms",
        "packet_loss_rate",
        "base_packet_loss_rate",
        "availability",
        "base_availability",
        "snr_db",
        "antenna_gain_db",
        "handover_disturbance_ms",
        "congestion_multiplier",
    ]:
        assert key in link


def test_snapshot_endpoint_conflicts_before_stage_exists() -> None:
    test_client = client()
    session_id = create_session(test_client)
    response = test_client.get(f"/api/v1/sessions/{session_id}/snapshots/after_healing")
    assert response.status_code == 409


def test_graph_stages_do_not_share_mutated_state() -> None:
    state = create_staged_state("configs/default_scenario.yaml")
    build_topology_step(state)
    calculate_routes_step(state)
    run_nominal_step(state)
    inject_faults_step(state)
    assert state.nominal_graph.nodes["lander_main_hub"]["active"] is True
    assert state.faulted_graph.nodes["lander_main_hub"]["active"] is False
    analyze_fault_impact_step(state)
    execute_healing_step(state)
    assert "protected_services" not in state.faulted_graph.graph
    assert "protected_services" in state.healed_graph.graph
    nominal_snapshot = graph_snapshot(state.nominal_graph, state.scenario)
    assert nominal_snapshot["summary"]["active_node_count"] == 12
