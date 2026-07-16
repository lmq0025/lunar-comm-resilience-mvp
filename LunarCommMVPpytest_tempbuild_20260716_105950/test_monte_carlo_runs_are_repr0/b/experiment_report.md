# Experiment Report: main_hub_monte_carlo

Purpose: Estimate subnet paralysis risk after main hub failure.

Experiment type: `monte_carlo`
Run count: 10

## Parameter Settings

```yaml
experiment:
  name: main_hub_monte_carlo
  type: monte_carlo
  purpose: Estimate subnet paralysis risk after main hub failure.
  n_runs: 10
  random_seed: 123
  save_run_scenarios: false
risk_target: 0.01
stochastic:
  enabled: true
  link_failure_sampling: true
  sampled_link_kinds:
  - redundant_surface
  - surface_to_orbit
  node_failure_sampling: false
randomized_parameters:
  main_hub_failure_severity:
    distribution: uniform
    min: 0.75
    max: 1.0
  backup_link_availability:
    distribution: uniform
    min: 0.994
    max: 0.9995
  dust_level:
    distribution: uniform
    min: 0.0
    max: 0.9
  relay_handover_extra_delay_ms:
    distribution: uniform
    min: 0
    max: 200
  buffer_overflow_severity:
    distribution: uniform
    min: 0.1
    max: 0.8
output_metrics:
- subnet_paralysis_probability
- route_convergence_time_ms
- science_data_interruption_s
- video_return_success_rate
- control_command_loss_rate
```

## Key Statistics

| Metric | Mean | P95 | P99 | Pass Rate |
| --- | ---: | ---: | ---: | ---: |
| `indicator_pass_count` | 13.5 | 14 | 14 |  |
| `indicator_total_count` | 14 | 14 | 14 |  |
| `applicable_indicator_count` | 14 | 14 | 14 |  |
| `not_applicable_indicator_count` | 0 | 0 | 0 |  |
| `stochastic_enabled` | 1 | 1 | 1 |  |
| `stochastic_failed_link_count` | 0 | 0 | 0 |  |
| `subnet_paralysis_probability` | 0 | 0 | 0 | 1 |
| `route_convergence_time_ms` | 35 | 35 | 35 | 1 |
| `relay_handover_delay_disturbance_ms` | 29.9854 | 35 | 35 | 1 |
| `control_command_loss_rate` | 9.41044e-06 | 1.40455e-05 | 1.43661e-05 | 0.7 |
| `video_return_success_rate` | 0.999947 | 0.999964 | 0.999964 | 1 |
| `science_data_interruption_s` | 0.455 | 0.455 | 0.455 | 1 |
| `resource_contention_resolution_rate` | 1 | 1 | 1 | 1 |
| `cascading_fault_prediction_accuracy` | 1 | 1 | 1 | 1 |
| `fault_propagation_delay_error_pct` | 1.48487 | 1.48487 | 1.48487 | 1 |
| `rf_lifetime_prediction_error_pct` | 3.90603 | 3.90603 | 3.90603 | 1 |
| `dust_gain_loss_quantification_error_pct` | 3.90618 | 5.62255 | 5.8061 | 0.8 |
| `predicted_gain_loss_db` | 0.915729 | 2.43267 | 2.55304 |  |
| `reference_gain_loss_db` | 0.946817 | 2.51391 | 2.63939 |  |

## Relation To Single-Scenario Demo

The single demo validates one deterministic scenario. This experiment repeats the same closed-loop simulator across parameter mutations to estimate sensitivity, risk, and strategy contribution.

## Current Limitations

The experiment layer still uses the MVP parameterized models rather than high-fidelity RF, orbital, queueing, or protocol-stack models.

## Additional Notes

Estimated subnet paralysis risk: 0
95% Wilson CI: [0, 0.27754]
Risk target: <= 0.01; passed: True
Stochastic link failure sampling enabled: True
If observed risk is 0, it means no failure was observed in this sample, not that the true risk is absolutely zero.
Risk is the share of runs where after-healing subnet_paralysis_probability > 0.01.