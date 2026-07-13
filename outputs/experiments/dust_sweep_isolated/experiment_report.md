# Experiment Report: dust_sweep_isolated

Purpose: Isolate lunar dust physical-layer effects without mission fault interference.

Experiment type: `sweep`
Run count: 7

## Parameter Settings

```yaml
experiment:
  name: dust_sweep_isolated
  type: sweep
  purpose: Isolate lunar dust physical-layer effects without mission fault interference.
parameter:
  name: dust_level
  values:
  - 0.0
  - 0.1
  - 0.2
  - 0.35
  - 0.5
  - 0.7
  - 0.9
mutations:
  disable_fault_types:
  - main_hub_failure
  - buffer_overflow
  - relay_handover_delay
output_metrics:
- antenna_gain_db
- snr_db
- packet_loss_rate
- ka_active_path_availability
- predicted_gain_loss_db
- dust_gain_loss_quantification_error_pct
```

## Key Statistics

| Metric | Mean | P95 | P99 | Pass Rate |
| --- | ---: | ---: | ---: | ---: |
| `indicator_pass_count` | 8 | 8 | 8 |  |
| `indicator_total_count` | 14 | 14 | 14 |  |
| `applicable_indicator_count` | 9 | 9 | 9 |  |
| `not_applicable_indicator_count` | 5 | 5 | 5 |  |
| `subnet_paralysis_probability` | 0 | 0 | 0 | 1 |
| `route_convergence_time_ms` | nan | nan | nan | 0 |
| `relay_handover_delay_disturbance_ms` | 0 | 0 | 0 | 1 |
| `control_command_loss_rate` | 6.6188e-06 | 9.48726e-06 | 9.79518e-06 | 1 |
| `video_return_success_rate` | 0.999962 | 0.999976 | 0.999976 | 1 |
| `science_data_interruption_s` | 0 | 0 | 0 | 1 |
| `resource_contention_resolution_rate` | 1 | 1 | 1 | 1 |
| `cascading_fault_prediction_accuracy` | 0.5 | 0.5 | 0.5 | 0 |
| `fault_propagation_delay_error_pct` | 0.596421 | 0.596421 | 0.596421 | 1 |
| `rf_lifetime_prediction_error_pct` | 3.90603 | 3.90603 | 3.90603 | 1 |
| `dust_gain_loss_quantification_error_pct` | 2.57143 | 3 | 3 | 1 |
| `predicted_gain_loss_db` | 1.18174 | 2.67254 | 2.8532 |  |
| `reference_gain_loss_db` | 1.21829 | 2.7552 | 2.94144 |  |
| `parameter_value` | 0.392857 | 0.84 | 0.888 |  |
| `dust_level` | 0.392857 | 0.84 | 0.888 |  |
| `antenna_gain_db` | 22.4714 | 23.56 | 23.632 |  |
| `snr_db` | 19.1464 | 20.235 | 20.307 |  |
| `packet_loss_rate` | 1.16582e-05 | 1.67107e-05 | 1.72531e-05 |  |
| `ka_active_path_availability` | 0.998536 | 0.998826 | 0.998845 |  |

## Relation To Single-Scenario Demo

The single demo validates one deterministic scenario. This experiment repeats the same closed-loop simulator across parameter mutations to estimate sensitivity, risk, and strategy contribution.

## Current Limitations

The experiment layer still uses the MVP parameterized models rather than high-fidelity RF, orbital, queueing, or protocol-stack models.