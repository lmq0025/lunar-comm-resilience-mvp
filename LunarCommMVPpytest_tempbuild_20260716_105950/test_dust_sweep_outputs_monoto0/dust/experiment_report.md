# Experiment Report: dust_sweep

Purpose: Quantify lunar dust impact on RF and service metrics.

Experiment type: `sweep`
Run count: 7

## Parameter Settings

```yaml
experiment:
  name: dust_sweep
  type: sweep
  purpose: Quantify lunar dust impact on RF and service metrics.
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
output_metrics:
- antenna_gain_db
- snr_db
- packet_loss_rate
- ka_active_path_availability
- video_return_success_rate
```

## Key Statistics

| Metric | Mean | P95 | P99 | Pass Rate |
| --- | ---: | ---: | ---: | ---: |
| `indicator_pass_count` | 13.5714 | 14 | 14 |  |
| `indicator_total_count` | 14 | 14 | 14 |  |
| `applicable_indicator_count` | 14 | 14 | 14 |  |
| `not_applicable_indicator_count` | 0 | 0 | 0 |  |
| `subnet_paralysis_probability` | 0 | 0 | 0 | 1 |
| `route_convergence_time_ms` | 35 | 35 | 35 | 1 |
| `relay_handover_delay_disturbance_ms` | 35 | 35 | 35 | 1 |
| `control_command_loss_rate` | 1.0229e-05 | 1.4662e-05 | 1.51379e-05 | 0.571429 |
| `video_return_success_rate` | 0.999942 | 0.999963 | 0.999964 | 1 |
| `science_data_interruption_s` | 0.455 | 0.455 | 0.455 | 1 |
| `resource_contention_resolution_rate` | 1 | 1 | 1 | 1 |
| `cascading_fault_prediction_accuracy` | 1 | 1 | 1 | 1 |
| `fault_propagation_delay_error_pct` | 1.48487 | 1.48487 | 1.48487 | 1 |
| `rf_lifetime_prediction_error_pct` | 3.90603 | 3.90603 | 3.90603 | 1 |
| `dust_gain_loss_quantification_error_pct` | 2.57143 | 3 | 3 | 1 |
| `predicted_gain_loss_db` | 1.18174 | 2.67254 | 2.8532 |  |
| `reference_gain_loss_db` | 1.21829 | 2.7552 | 2.94144 |  |
| `parameter_value` | 0.392857 | 0.84 | 0.888 |  |
| `dust_level` | 0.392857 | 0.84 | 0.888 |  |
| `antenna_gain_db` | 22.4714 | 23.56 | 23.632 |  |
| `snr_db` | 19.1464 | 20.235 | 20.307 |  |
| `packet_loss_rate` | 0.157508 | 0.157511 | 0.157512 |  |
| `ka_active_path_availability` | 0.998236 | 0.998526 | 0.998545 |  |

## Relation To Single-Scenario Demo

The single demo validates one deterministic scenario. This experiment repeats the same closed-loop simulator across parameter mutations to estimate sensitivity, risk, and strategy contribution.

## Current Limitations

The experiment layer still uses the MVP parameterized models rather than high-fidelity RF, orbital, queueing, or protocol-stack models.