import type { ScenarioPayload } from "../api/generated/openapi";

export function createBlankScenario(name: string): ScenarioPayload {
  return {
    scenario: {
      name,
      duration_s: 120,
      random_seed: 42
    },
    environment: {
      dust_level: 0,
      temperature_c: -45,
      radiation_level: 0,
      obstruction_probability: 0,
      obstruction_duration_s: 0,
      relay_handover: {
        handover_start_s: 0,
        handover_duration_s: 0,
        handover_extra_delay_ms: 0
      }
    },
    model_parameters: {},
    physical_model_config: {},
    fault_propagation: {
      enabled: false,
      nodes: [],
      edges: []
    },
    nodes: [],
    links: [],
    services: [],
    faults: {
      enabled: [],
      schedule: []
    },
    healing: {
      enabled: []
    },
    technical_indicators: []
  };
}
