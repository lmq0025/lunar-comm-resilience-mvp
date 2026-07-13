# Round 2 Refactor Notes

## Problems Before This Round

- `engine.py` produced the after-healing graph by calling fault injection with a `healed=True` shortcut.
- `healing.py` only listed strategy names and did not change simulation state.
- `metrics.py` embedded the 14 acceptance thresholds and several placeholder pass values.
- Several metrics, including route convergence, subnet paralysis, contention resolution, and science-data interruption, were not driven by the simulated state.
- Tests mostly checked that the demo ran, not that bad scenarios could fail.

## Three-Stage Closed Loop

The engine now runs three explicit stages:

1. `nominal`: build and evaluate the configured network before faults.
2. `before_healing`: apply configured faults and evaluate the damaged network.
3. `after_healing`: apply configured healing strategies to the faulted graph, then evaluate the recovered network.

The exported metrics and service results keep these phases separate.

## Fault and Healing Separation

`faults.py` only injects damage: failed nodes, inactive links, RF degradation, relay handover delay, congestion, and node processing delay.

`healing.py` applies recovery actions to the already-faulted graph. It records `healing_actions.csv` and writes state such as protected services, degraded services, buffered services, route convergence time, and reduced handover disturbance for later simulation and metric calculation.

## MVP Benchmark Metrics

These remain benchmark-model metrics in this MVP:

- RF lifetime prediction error
- Lunar-dust gain-loss quantification error
- Cascading fault prediction accuracy
- Fault propagation delay quantification error

They are now emitted as normal metric rows before `indicator_check.csv` is built, so the acceptance table does not hand-fill their actual values.

## Simulation-Driven Metrics

These are now driven by topology, service, fault, or healing state:

- link and channel availability
- SNR, antenna gain, packet loss, and bit error rate
- network connectivity and end-to-end delay
- route convergence time
- relay handover delay disturbance
- subnet paralysis probability
- control command loss rate
- HD video return success rate
- science-data interruption
- service-degradation decision time
- resource-contention resolution rate
- teleoperation availability

## Round 3 Suggestions

- Add Monte Carlo runs for obstruction and cascading fault propagation.
- Replace benchmark metrics with literature data or calibrated high-fidelity simulation outputs.
- Add time-series event simulation for intermittent link outages instead of steady-state snapshots.
- Add policy comparison experiments for different healing strategy sets.
- Add a small dashboard view for comparing multiple output directories.
