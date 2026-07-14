import type { ScenarioPayload } from "../../src/api/contracts";

export function defaultLikeScenario(): ScenarioPayload {
  return {
    scenario: { name: "default_lunar_comm_resilience_mvp", duration_s: 120, random_seed: 42 },
    environment: { dust_level: 0.35 },
    nodes: Array.from({ length: 12 }, (_, index) => ({
      id: `node_${index + 1}`,
      type: index === 0 ? "main_hub" : "surface_relay",
      role: "test_role"
    })),
    links: Array.from({ length: 20 }, (_, index) => ({
      id: `link_${index + 1}`,
      source: `node_${(index % 12) + 1}`,
      target: `node_${((index + 1) % 12) + 1}`,
      kind: "local",
      bandwidth_mbps: 10,
      delay_ms: 10,
      packet_loss_rate: 0.00001,
      availability: 0.999,
      active: true
    })),
    services: Array.from({ length: 4 }, (_, index) => ({
      id: `service_${index + 1}`,
      source: "node_1",
      target: "node_2",
      priority: index + 1,
      required_bandwidth_mbps: 1
    })),
    faults: {
      enabled: ["main_hub_failure", "dust_antenna_degradation", "relay_handover_delay", "buffer_overflow"],
      schedule: Array.from({ length: 4 }, (_, index) => ({
        id: `F${index + 1}`,
        type: "main_hub_failure",
        start_s: 10,
        duration_s: 20,
        target: "node_1",
        severity: 0.8
      }))
    },
    healing: {
      enabled: ["reroute_backup_path", "priority_scheduling", "service_degradation", "store_and_forward", "relay_pre_handover"]
    },
    technical_indicators: Array.from({ length: 14 }, (_, index) => ({
      id: `indicator_${index + 1}`,
      name: `Indicator ${index + 1}`,
      layer: "network",
      operator: "<=",
      threshold: 1,
      unit: "ratio",
      metric: `metric_${index + 1}`,
      verification_method: "test"
    }))
  };
}
