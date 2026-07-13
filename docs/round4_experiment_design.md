# Round 4 Experiment Design

## Why Batch Experiments

The single demo proves one deterministic closed loop. Batch experiments show whether the same fault-healing chain remains stable across parameter uncertainty, sensitivity sweeps, and strategy combinations.

## Main-Hub Monte Carlo

`main_hub_monte_carlo.yaml` estimates the risk that main hub failure still causes subnet paralysis after self-healing. The reported `estimated_subnet_paralysis_risk` is the fraction of runs where after-healing `subnet_paralysis_probability > 0.01`, directly matching the target risk of no more than 1%.

## Dust Sweep

`dust_sweep.yaml` scans `dust_level` from clean to severe conditions. It traces antenna gain, SNR, packet loss, Ka active-path availability, and video success rate to show how the MVP dust model affects physical and service layers.

## Relay Handover Sweep

`relay_handover_sweep.yaml` varies `handover_extra_delay_ms` and intentionally omits `relay_pre_handover` so the observed disturbance follows the configured handover stress. This validates the delay-disturbance target of no more than 50 ms under pre-handover protection and shows the penalty when it is absent.

## Healing Ablation

`healing_ablation.yaml` compares no healing, reroute-only, reroute plus priority scheduling, reroute plus priority plus degradation, and full healing. It demonstrates which strategies restore reachability, protect priority traffic, reduce video demand, buffer science data, and suppress relay handover disturbance.

## MVP Benchmark Metrics

RF lifetime prediction error, dust gain-loss quantification error, cascading fault prediction accuracy, and fault propagation delay error remain internal benchmark metrics in this MVP.

## Future Data Integration

The experiment framework can replace internal parameter draws with literature distributions, hardware-in-the-loop data, high-fidelity RF propagation results, orbital visibility windows, or queue-level packet simulation outputs.
