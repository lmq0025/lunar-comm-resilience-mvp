# Lunar Communication Resilience MVP Report

Scenario: `default_lunar_comm_resilience_mvp`
Duration: 120 s

## Closed Loop

Scenario configuration -> topology construction -> nominal route table -> fault injection -> inherited route validation -> self-healing route update -> service simulation -> layered metrics -> report generation.

## Three-Phase Metric Comparison

| Metric | Nominal | Before healing | After healing |
| --- | ---: | ---: | ---: |
| `network_connectivity` | 1 | 1 | 1 |
| `subnet_paralysis_probability` | 0 | 0 | 0 |
| `route_convergence_time_ms` | 0 | N/A | N/A |
| `relay_handover_delay_disturbance_ms` | 0 | 0 | 0 |
| `control_command_loss_rate` | 2.25498e-05 | 3.04422e-05 | 7.30613e-06 |
| `video_return_success_rate` | 0.999969 | 0.999958 | 0.999958 |
| `science_data_interruption_s` | 0 | 0 | 0 |
| `ka_channel_availability` | 0.99866 | 0.99845 | 0.99845 |
| `ka_configured_channel_availability` | 0.998185 | 0.997975 | 0.997975 |
| `ka_active_path_availability` | 0.99866 | 0.99845 | 0.99845 |

## Service Route Comparison

| Phase | Service | Valid | Source | Path | Notes |
| --- | --- | --- | --- | --- | --- |
| nominal | control_command | True | nominal_computed | ground_station -> lunar_orbiter -> lander_main_hub -> rover_1 |  |
| nominal | science_data | True | nominal_computed | science_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| nominal | hd_video | True | nominal_computed | camera_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| nominal | teleoperation | True | nominal_computed | teleop_terminal -> lander_main_hub -> rover_2 |  |
| before_healing | control_command | True | inherited_nominal | ground_station -> lunar_orbiter -> lander_main_hub -> rover_1 |  |
| before_healing | science_data | True | inherited_nominal | science_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| before_healing | hd_video | True | inherited_nominal | camera_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| before_healing | teleoperation | True | inherited_nominal | teleop_terminal -> lander_main_hub -> rover_2 |  |
| after_healing | control_command | True | reroute_backup_path | ground_station -> lunar_orbiter -> lander_main_hub -> rover_1 |  |
| after_healing | science_data | True | reroute_backup_path | science_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| after_healing | hd_video | True | reroute_backup_path | camera_station -> lander_main_hub -> lunar_orbiter -> ground_station |  |
| after_healing | teleoperation | True | reroute_backup_path | teleop_terminal -> lander_main_hub -> rover_2 |  |

## Fault Events

| Fault | Target | Start (s) | Duration (s) | Severity | Effect |
| --- | --- | ---: | ---: | ---: | --- |
| dust_antenna_degradation | all_rf_links | 10 | 90 | 0.35 | RF links degraded by dust severity |

## Healing Actions

| Strategy | Target | Success | Response (ms) | Notes |
| --- | --- | --- | ---: | --- |
| priority_scheduling | control_command,teleoperation | True | 80.0 | protected high-priority services |
| service_degradation | hd_video | True | 120.0 | HD video bitrate reduced to degraded_bandwidth_mbps |
| store_and_forward | science_data | True | 420.0 | science data buffered for resume forwarding |
| relay_pre_handover | relay_links | False | 0.0 | no handover disturbance found |
| reroute_backup_path | active_topology | False | inf | rerouted services: 0; failed services: 0 |

## Fault Propagation Prediction

Propagation model enabled: True
Configured propagation nodes: 13
Configured propagation edges: 9

### Predicted Paths

| Root fault | Predicted effect | Layer | Probability | Delay (ms) | Path |
| --- | --- | --- | ---: | ---: | --- |
| dust_antenna_degradation | packet_loss_increase | physical | 0.765 | 10 | dust_antenna_degradation -> snr_degradation -> packet_loss_increase |
| dust_antenna_degradation | snr_degradation | physical | 0.9 | 5 | dust_antenna_degradation -> snr_degradation |

### Observed Impacts

| Impact | Layer | Delay (ms) | Evidence |
| --- | --- | ---: | --- |
| snr_degradation | physical | 5.03 | before_healing snr_db below nominal |
| packet_loss_increase | physical | 10.06 | before_healing packet_loss_rate above nominal |
| congestion_increase | network | 10.14 | before_healing congestion_rate above nominal |
| service_qos_drop | service | 30.72 | before_healing service success_rate below 0.999 |

### Prediction Comparison

| Effect | Observed | TP | FP | FN | Delay error (%) |
| --- | --- | --- | --- | --- | ---: |
| congestion_increase | True | False | False | True | N/A |
| packet_loss_increase | True | True | False | False | 0.596421 |
| service_qos_drop | True | False | False | True | N/A |
| snr_degradation | True | True | False | False | 0.596421 |

- Cascading fault prediction accuracy: 0.5
- Fault propagation delay error: 0.596421%
- Current delay errors are based on MVP-level event timing assumptions, not high-fidelity physical propagation measurements.

## Physical Influence Model Validation

RF lifetime and lunar-dust antenna gain-loss errors are calculated by comparing MVP model predictions with internal replaceable reference curves.

| Model | Predicted | Reference | Error (%) | Target (%) | Passed | Reference source |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| rf_lifetime | 76418.7 | 79525 | 3.90603 | 10 | True | E:/LunarCommMVP/lunar-comm-resilience-mvp/data/baselines/rf_lifetime_reference.csv |
| dust_gain | 1.455 | 1.5 | 3 | 5 | True | E:/LunarCommMVP/lunar-comm-resilience-mvp/data/baselines/dust_gain_reference.csv |

- RF lifetime prediction error: 3.90603%
- Dust gain loss quantification error: 3%
- The reference curves are MVP internal baselines that can be replaced by literature, high-fidelity simulation, or test data.

## Before/After Improvements

- Subnet paralysis probability delta: 0
- Relay handover disturbance delta: 0 ms
- HD video success-rate delta: 0
- Science-data interruption delta: 0 s

## Key After-Healing Metrics

- Network connectivity: 1
- Route convergence time: N/A ms
- Relay handover disturbance: 0 ms
- Control command loss rate: 7.30613e-06
- HD video success rate: 0.999958
- Science data interruption: 0 s

## Indicator Check

8/9 applicable technical indicators passed. Total configured indicators: 14.

Not applicable indicators are not failures; they indicate the current scenario did not trigger the required validation condition.

### Not Applicable Indicators

| Indicator | Reason |
| --- | --- |
| Main-hub failure subnet paralysis probability | missing enabled fault types: main_hub_failure |
| Relay handover end-to-end delay disturbance | missing enabled fault types: relay_handover_delay |
| Route convergence time | missing enabled fault types: main_hub_failure |
| Resource contention resolution rate | missing enabled fault types: buffer_overflow |
| Science data return interruption | missing enabled fault types: main_hub_failure |

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
