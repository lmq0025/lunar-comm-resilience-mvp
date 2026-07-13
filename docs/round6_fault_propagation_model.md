# Round 6 Fault Propagation Model

## Why Add Fault Propagation Prediction

Earlier MVP rounds could inject faults and measure recovery, but cascading fault prediction metrics still used fixed benchmark values. Round 6 adds a lightweight propagation graph so prediction accuracy and propagation-delay error are calculated from simulated predicted effects versus observed impacts.

## Research Mapping

The propagation graph maps fault roots, network effects, physical-layer degradation, congestion, and service impacts. This corresponds to the research requirement for failure propagation prediction and cascading fault analysis.

## Prediction Path Generation

`fault_propagation.nodes` and `fault_propagation.edges` in `default_scenario.yaml` define a directed graph. For each injected root fault, the simulator traverses reachable effects and accumulates edge probability and delay along the shortest propagation path.

## Observed Impact Extraction

Observed impacts are extracted from route validity, service reachability, layered metrics, and service QoS results. Examples include `route_invalid`, `service_unreachable`, `snr_degradation`, `packet_loss_increase`, `congestion_increase`, `science_data_interruption`, and `video_return_failure`.

## Cascading Fault Prediction Accuracy

`cascading_fault_prediction_accuracy` is:

correctly predicted observed effects / union of predicted and observed effects

This value decreases when the configured propagation graph misses observed simulated effects or predicts effects that do not appear.

## Fault Propagation Delay Error

`fault_propagation_delay_error_pct` is the average relative delay error for true-positive effects:

abs(predicted_delay_ms - observed_delay_ms) / observed_delay_ms * 100

If no true-positive effects exist, the metric is infinite and should fail or be marked not applicable depending on scenario applicability.

## Indicator Applicability

Each technical indicator can declare `applicable_when`. A not-applicable indicator is not a pass and not a failure; it means the experiment did not trigger the required validation condition. For example, route convergence is not applicable when main-hub failure is disabled.

## MVP Assumptions

The current propagation model is deterministic and graph-based. Observed delays are MVP event-timing abstractions derived from simulation state, not calibrated field measurements.

## Future Upgrades

The graph can be upgraded to Bayesian networks, dynamic fault trees, data-driven causal graphs, or high-fidelity simulation traces once literature data or hardware measurements are available.
