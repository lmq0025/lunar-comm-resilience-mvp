# Experiment Report: main_hub_monte_carlo_fast

Purpose: Fast smoke version of main hub Monte Carlo risk estimation.

Experiment type: `monte_carlo`
Run count: 50

## Parameter Settings

```yaml
experiment:
  name: main_hub_monte_carlo_fast
  type: monte_carlo
  purpose: Fast smoke version of main hub Monte Carlo risk estimation.
  n_runs: 50
  random_seed: 2026
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
| `indicator_pass_count` | 13.34 | 14 | 14 |  |
| `indicator_total_count` | 14 | 14 | 14 |  |
| `applicable_indicator_count` | 14 | 14 | 14 |  |
| `not_applicable_indicator_count` | 0 | 0 | 0 |  |
| `stochastic_enabled` | 1 | 1 | 1 |  |
| `stochastic_failed_link_count` | 0.04 | 0 | 1 |  |
| `subnet_paralysis_probability` | 0 | 0 | 0 | 1 |
| `route_convergence_time_ms` | 35 | 35 | 35 | 1 |
| `relay_handover_delay_disturbance_ms` | 33.5451 | 35 | 35 | 1 |
| `control_command_loss_rate` | 1.11171e-05 | 1.49752e-05 | 1.51167e-05 | 0.36 |
| `video_return_success_rate` | 0.999937 | 0.999958 | 0.999961 | 1 |
| `science_data_interruption_s` | 0.455 | 0.455 | 0.455 | 1 |
| `resource_contention_resolution_rate` | 1 | 1 | 1 | 1 |
| `cascading_fault_prediction_accuracy` | 1 | 1 | 1 | 1 |
| `fault_propagation_delay_error_pct` | 1.48487 | 1.48487 | 1.48487 | 1 |
| `rf_lifetime_prediction_error_pct` | 3.90603 | 3.90603 | 3.90603 | 1 |
| `dust_gain_loss_quantification_error_pct` | 3.33049 | 3.52247 | 4.37418 | 0.98 |
| `predicted_gain_loss_db` | 1.44812 | 2.78773 | 2.84313 |  |
| `reference_gain_loss_db` | 1.49677 | 2.87778 | 2.93315 |  |

## Relation To Single-Scenario Demo

The single demo validates one deterministic scenario. This experiment repeats the same closed-loop simulator across parameter mutations to estimate sensitivity, risk, and strategy contribution.

## Current Limitations

The experiment layer still uses the MVP parameterized models rather than high-fidelity RF, orbital, queueing, or protocol-stack models.

## Additional Notes

Estimated subnet paralysis risk: 0
95% Wilson CI: [0, 0.07135]
Risk target: <= 0.01; passed: True
Stochastic link failure sampling enabled: True
If observed risk is 0, it means no failure was observed in this sample, not that the true risk is absolutely zero.
Risk is the share of runs where after-healing subnet_paralysis_probability > 0.01.