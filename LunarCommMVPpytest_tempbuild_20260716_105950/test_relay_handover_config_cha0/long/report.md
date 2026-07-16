# Lunar Communication Resilience MVP Report

Scenario: `default_lunar_comm_resilience_mvp`
Duration: 120 s

## Closed Loop

Scenario configuration -> topology construction -> nominal route table -> fault injection -> inherited route validation -> self-healing route update -> service simulation -> layered metrics -> report generation.

## Three-Phase Metric Comparison

| Metric | Nominal | Before healing | After healing |
| --- | ---: | ---: | ---: |
| `network_connectivity` | 1 | 0.916667 | 0.916667 |
| `subnet_paralysis_probability` | 0 | 1 | 0 |
| `route_convergence_time_ms` | 0 | N/A | 35 |
| `relay_handover_delay_disturbance_ms` | 0 | 180 | 35 |
| `control_command_loss_rate` | 1.95799e-05 | 1 | 9.80413e-06 |
| `video_return_success_rate` | 0.999973 | 0 | 0.999945 |
| `science_data_interruption_s` | 0 | 120 | 0.455 |
| `ka_channel_availability` | 0.99878 | 0 | 0.99827 |
| `ka_configured_channel_availability` | 0.998305 | 0.748528 | 0.748528 |
| `ka_active_path_availability` | 0.99878 | 0 | 0.99827 |

## Service Route Comparison

| Phase | Service | Valid | Source | Path | Notes |
| --- | --- | --- | --- | --- | --- |
| nominal | control_command | True | nominal_computed | ground_station -> lunar_orbiter -> lander_main_hub -> rover_1 |  |
| nominal | science_data | True | nominal_computed | science_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| nominal | hd_video | True | nominal_computed | camera_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| nominal | teleoperation | True | nominal_computed | teleop_terminal -> lander_main_hub -> rover_2 |  |
| before_healing | control_command | False | inherited_nominal | ground_station -> lunar_orbiter -> lander_main_hub -> rover_1 | inactive node lander_main_hub |
| before_healing | science_data | False | inherited_nominal | science_station -> lander_main_hub -> lunar_orbiter -> ground_station | inactive node lander_main_hub |
| before_healing | hd_video | False | inherited_nominal | camera_station -> lander_main_hub -> lunar_orbiter -> ground_station | inactive node lander_main_hub |
| before_healing | teleoperation | False | inherited_nominal | teleop_terminal -> lander_main_hub -> rover_2 | inactive node lander_main_hub |
| after_healing | control_command | True | reroute_backup_path | ground_station -> lunar_orbiter -> relay_backup_1 -> rover_1 |  |
| after_healing | science_data | True | reroute_backup_path | science_station -> relay_backup_1 -> lunar_orbiter -> ground_station |  |
| after_healing | hd_video | True | reroute_backup_path | camera_station -> relay_backup_2 -> lunar_orbiter -> ground_station |  |
| after_healing | teleoperation | True | reroute_backup_path | teleop_terminal -> relay_backup_2 -> rover_2 |  |

## Fault Events

| Fault | Target | Start (s) | Duration (s) | Severity | Effect |
| --- | --- | ---: | ---: | ---: | --- |
| main_hub_failure | lander_main_hub | 30 | 25 | 0.95 | primary hub disabled; backup paths remain available for rerouting |
| dust_antenna_degradation | all_rf_links | 10 | 90 | 0.35 | RF links degraded by dust severity |
| relay_handover_delay | lunar_orbiter | 45 | 5 | 0.6 | relay handover disturbance set to 180.0 ms |
| buffer_overflow | edge_compute | 62 | 12 | 0.5 | congestion multiplier set to 2.20 |

## Healing Actions

| Strategy | Target | Success | Response (ms) | Notes |
| --- | --- | --- | ---: | --- |
| priority_scheduling | control_command,teleoperation | True | 80.0 | protected high-priority services |
| service_degradation | hd_video | True | 120.0 | HD video bitrate reduced to degraded_bandwidth_mbps |
| store_and_forward | science_data | True | 420.0 | science data buffered for resume forwarding |
| relay_pre_handover | relay_links | True | 35.0 | updated 4 relay links |
| reroute_backup_path | active_topology | True | 35.0 | rerouted services: 4; failed services: 0 |

## Fault Propagation Prediction

Propagation model enabled: True
Configured propagation nodes: 13
Configured propagation edges: 9

### Predicted Paths

| Root fault | Predicted effect | Layer | Probability | Delay (ms) | Path |
| --- | --- | --- | ---: | ---: | --- |
| main_hub_failure | route_invalid | network | 0.98 | 10 | main_hub_failure -> route_invalid |
| main_hub_failure | science_data_interruption | service | 0.7448 | 45 | main_hub_failure -> route_invalid -> service_unreachable -> science_data_interruption |
| main_hub_failure | service_unreachable | service | 0.931 | 25 | main_hub_failure -> route_invalid -> service_unreachable |
| dust_antenna_degradation | packet_loss_increase | physical | 0.765 | 10 | dust_antenna_degradation -> snr_degradation -> packet_loss_increase |
| dust_antenna_degradation | snr_degradation | physical | 0.9 | 5 | dust_antenna_degradation -> snr_degradation |
| relay_handover_delay | end_to_end_delay_increase | network | 0.95 | 20 | relay_handover_delay -> end_to_end_delay_increase |
| buffer_overflow | congestion_increase | network | 0.9 | 10 | buffer_overflow -> congestion_increase |
| buffer_overflow | service_qos_drop | service | 0.72 | 30 | buffer_overflow -> congestion_increase -> service_qos_drop |
| buffer_overflow | video_return_failure | service | 0.54 | 55 | buffer_overflow -> congestion_increase -> service_qos_drop -> video_return_failure |

### Observed Impacts

| Impact | Layer | Delay (ms) | Evidence |
| --- | --- | ---: | --- |
| route_invalid | network | 10.12 | before_healing route_valid=false |
| service_unreachable | service | 25.45 | before_healing service reachable=false |
| snr_degradation | physical | 5.03 | before_healing snr_db below nominal |
| packet_loss_increase | physical | 10.06 | before_healing packet_loss_rate above nominal |
| end_to_end_delay_increase | network | 20.28 | handover disturbance or delay increase observed |
| congestion_increase | network | 10.14 | before_healing congestion_rate above nominal |
| service_qos_drop | service | 30.72 | before_healing service success_rate below 0.999 |
| science_data_interruption | service | 45.81 | science_data interruption_s > 0 |
| video_return_failure | service | 56.32 | hd_video success_rate below target |

### Prediction Comparison

| Effect | Observed | TP | FP | FN | Delay error (%) |
| --- | --- | --- | --- | --- | ---: |
| congestion_increase | True | True | False | False | 1.38067 |
| end_to_end_delay_increase | True | True | False | False | 1.38067 |
| packet_loss_increase | True | True | False | False | 0.596421 |
| route_invalid | True | True | False | False | 1.18577 |
| science_data_interruption | True | True | False | False | 1.76817 |
| service_qos_drop | True | True | False | False | 2.34375 |
| service_unreachable | True | True | False | False | 1.76817 |
| snr_degradation | True | True | False | False | 0.596421 |
| video_return_failure | True | True | False | False | 2.34375 |

- Cascading fault prediction accuracy: 1
- Fault propagation delay error: 1.48487%
- Current delay errors are based on MVP-level event timing assumptions, not high-fidelity physical propagation measurements.

## Physical Influence Model Validation

RF lifetime and lunar-dust antenna gain-loss errors are calculated by comparing MVP model predictions with internal replaceable reference curves.

| Model | Predicted | Reference | Error (%) | Target (%) | Passed | Reference source |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| rf_lifetime | 76418.7 | 79525 | 3.90603 | 10 | True | E:/LunarCommMVP/lunar-comm-resilience-mvp/data/baselines/rf_lifetime_reference.csv |
| dust_gain | 0.97776 | 1.008 | 3 | 5 | True | E:/LunarCommMVP/lunar-comm-resilience-mvp/data/baselines/dust_gain_reference.csv |

- RF lifetime prediction error: 3.90603%
- Dust gain loss quantification error: 3%
- The reference curves are MVP internal baselines that can be replaced by literature, high-fidelity simulation, or test data.

## Before/After Improvements

- Subnet paralysis probability delta: -1
- Relay handover disturbance delta: -145 ms
- HD video success-rate delta: 0.999945
- Science-data interruption delta: -119.545 s

## Key After-Healing Metrics

- Network connectivity: 0.916667
- Route convergence time: 35 ms
- Relay handover disturbance: 35 ms
- Control command loss rate: 9.80413e-06
- HD video success rate: 0.999945
- Science data interruption: 0.455 s

## Indicator Check

14/14 applicable technical indicators passed. Total configured indicators: 14.

Not applicable indicators are not failures; they indicate the current scenario did not trigger the required validation condition.

### Not Applicable Indicators

| Indicator | Reason |
| --- | --- |

Benchmark note: RF lifetime prediction error and lunar-dust gain-loss quantification error now compare MVP model predictions with internal replaceable reference curves. Propagation accuracy metrics use the MVP propagation graph when enabled.

Ka availability note: `ka_channel_availability` currently uses the active business-path definition and is mirrored by `ka_active_path_availability`; `ka_configured_channel_availability` counts all configured Ka-class links and treats inactive links as zero availability.

High-fidelity gaps: this MVP still does not model real 5G/WiFi protocol behavior, RF propagation, antenna pointing, orbital geometry, queue-level packet scheduling, or Monte Carlo fault propagation.

## Generated Artifacts

- `metrics_summary.csv`
- `indicator_check.csv`
- `fault_events.csv`
- `healing_actions.csv`
- `service_results.csv`
- `service_routes.csv`
- `fault_propagation_predictions.csv`
- `observed_impacts.csv`
- `fault_propagation_comparison.csv`
- `fault_propagation_metrics.csv`
- `physical_model_validation.csv`
- `physical_model_metrics.csv`
- `topology_nominal.png`
- `topology_before.png`
- `topology_after.png`
- `report.md`
