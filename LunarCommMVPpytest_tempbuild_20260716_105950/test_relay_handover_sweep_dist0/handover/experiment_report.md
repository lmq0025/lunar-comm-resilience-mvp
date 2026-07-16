# Experiment Report: relay_handover_sweep

Purpose: Quantify relay handover disturbance sensitivity.

Experiment type: `sweep`
Run count: 8

## Parameter Settings

```yaml
experiment:
  name: relay_handover_sweep
  type: sweep
  purpose: Quantify relay handover disturbance sensitivity.
parameter:
  name: relay_handover_extra_delay_ms
  values:
  - 0
  - 25
  - 50
  - 75
  - 100
  - 120
  - 150
  - 200
healing_enabled:
- reroute_backup_path
- priority_scheduling
- service_degradation
- store_and_forward
output_metrics:
- relay_handover_delay_disturbance_ms
- route_convergence_time_ms
- end_to_end_delay_ms
- science_data_interruption_s
```

## Key Statistics

| Metric | Mean | P95 | P99 | Pass Rate |
| --- | ---: | ---: | ---: | ---: |
| `indicator_pass_count` | 13.375 | 14 | 14 |  |
| `indicator_total_count` | 14 | 14 | 14 |  |
| `applicable_indicator_count` | 14 | 14 | 14 |  |
| `not_applicable_indicator_count` | 0 | 0 | 0 |  |
| `subnet_paralysis_probability` | 0 | 0 | 0 | 1 |
| `route_convergence_time_ms` | 35 | 35 | 35 | 1 |
| `relay_handover_delay_disturbance_ms` | 90 | 182.5 | 196.5 | 0.375 |
| `control_command_loss_rate` | 9.80413e-06 | 9.80413e-06 | 9.80413e-06 | 1 |
| `video_return_success_rate` | 0.999945 | 0.999945 | 0.999945 | 1 |
| `science_data_interruption_s` | 0.455 | 0.455 | 0.455 | 1 |
| `resource_contention_resolution_rate` | 1 | 1 | 1 | 1 |
| `cascading_fault_prediction_accuracy` | 1 | 1 | 1 | 1 |
| `fault_propagation_delay_error_pct` | 1.48487 | 1.48487 | 1.48487 | 1 |
| `rf_lifetime_prediction_error_pct` | 3.90603 | 3.90603 | 3.90603 | 1 |
| `dust_gain_loss_quantification_error_pct` | 3 | 3 | 3 | 1 |
| `predicted_gain_loss_db` | 0.97776 | 0.97776 | 0.97776 |  |
| `reference_gain_loss_db` | 1.008 | 1.008 | 1.008 |  |
| `parameter_value` | 90 | 182.5 | 196.5 |  |
| `relay_handover_extra_delay_ms` | 90 | 182.5 | 196.5 |  |
| `end_to_end_delay_ms` | 1188 | 1326.75 | 1347.75 |  |

## Relation To Single-Scenario Demo

The single demo validates one deterministic scenario. This experiment repeats the same closed-loop simulator across parameter mutations to estimate sensitivity, risk, and strategy contribution.

## Current Limitations

The experiment layer still uses the MVP parameterized models rather than high-fidelity RF, orbital, queueing, or protocol-stack models.