# Experiment Report: healing_ablation

Purpose: Compare self-healing strategy contribution.

Experiment type: `ablation`
Run count: 5

## Parameter Settings

```yaml
experiment:
  name: healing_ablation
  type: ablation
  purpose: Compare self-healing strategy contribution.
strategy_sets:
- name: no_healing
  healing_enabled: []
- name: reroute_only
  healing_enabled:
  - reroute_backup_path
- name: reroute_plus_priority
  healing_enabled:
  - reroute_backup_path
  - priority_scheduling
- name: reroute_plus_priority_plus_degradation
  healing_enabled:
  - reroute_backup_path
  - priority_scheduling
  - service_degradation
- name: full_healing
  healing_enabled:
  - reroute_backup_path
  - priority_scheduling
  - service_degradation
  - store_and_forward
  - relay_pre_handover
output_metrics:
- indicator_pass_count
- subnet_paralysis_probability
- route_convergence_time_ms
- control_command_loss_rate
- video_return_success_rate
- science_data_interruption_s
- resource_contention_resolution_rate
```

## Key Statistics

| Metric | Mean | P95 | P99 | Pass Rate |
| --- | ---: | ---: | ---: | ---: |
| `indicator_pass_count` | 9.4 | 13.4 | 13.88 |  |
| `indicator_total_count` | 14 | 14 | 14 |  |
| `applicable_indicator_count` | 12.4 | 13.8 | 13.96 |  |
| `not_applicable_indicator_count` | 1.6 | 2.8 | 2.96 |  |
| `subnet_paralysis_probability` | 0.2 | 0.8 | 0.96 | 0.8 |
| `route_convergence_time_ms` | 35 | 35 | 35 | 0.8 |
| `relay_handover_delay_disturbance_ms` | 103 | 120 | 120 | 0.2 |
| `control_command_loss_rate` | 0.200014 | 0.800008 | 0.960002 | 0.6 |
| `video_return_success_rate` | 0.509063 | 0.999945 | 0.999945 | 0.4 |
| `science_data_interruption_s` | 47.0001 | 103.636 | 116.727 | 0.2 |
| `resource_contention_resolution_rate` | 0.2 | 0.8 | 0.96 | 0.2 |
| `cascading_fault_prediction_accuracy` | 1 | 1 | 1 | 1 |
| `fault_propagation_delay_error_pct` | 1.48487 | 1.48487 | 1.48487 | 1 |
| `rf_lifetime_prediction_error_pct` | 3.90603 | 3.90603 | 3.90603 | 1 |
| `dust_gain_loss_quantification_error_pct` | 3 | 3 | 3 | 1 |
| `predicted_gain_loss_db` | 0.97776 | 0.97776 | 0.97776 |  |
| `reference_gain_loss_db` | 1.008 | 1.008 | 1.008 |  |

## Relation To Single-Scenario Demo

The single demo validates one deterministic scenario. This experiment repeats the same closed-loop simulator across parameter mutations to estimate sensitivity, risk, and strategy contribution.

## Current Limitations

The experiment layer still uses the MVP parameterized models rather than high-fidelity RF, orbital, queueing, or protocol-stack models.