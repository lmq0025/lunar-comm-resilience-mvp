# Demo Script for Customer

## 1. Project Goal

This software demonstrates a minimum closed-loop resilience evaluation tool for lunar-surface communication networks. The emphasis is traceable evaluation and self-healing verification, not a full communication protocol stack.

## 2. Lunar Communication Topology

Open `outputs/final_demo/demo_run/topology_nominal.png` or the Dashboard. Explain the ground station, lunar orbiter, lander hub, rover, relay, and backup surface links.

## 3. Route Failure Before Healing

Show `service_routes.csv` and compare `nominal` with `before_healing`. Highlight that before healing the inherited nominal route can fail after main-hub failure; the simulator does not silently recompute shortest paths.

## 4. Self-Healing Recovery

Show `healing_actions.csv` and `topology_after.png`. Explain how rerouting, priority scheduling, service degradation, store-and-forward, and relay pre-handover contribute to recovery.

## 5. Fourteen Indicator Checks

Open `indicator_check.csv` or the Dashboard indicator tab. Explain passed, failed, and not-applicable statuses, the thresholds, and the verification method for each indicator.

## 6. Batch Experiments

Show experiment outputs under `outputs/final_demo/experiments`, including healing ablation, isolated dust sweep, relay handover sweep, and fast Monte Carlo. Emphasize that batch experiments test whether conclusions remain stable under parameter changes.

## 7. Dashboard

Run `streamlit run lunar_comm_sim/app/dashboard.py`. The Dashboard reads `outputs/final_demo/demo_run` by default and falls back to `outputs/demo_run`.

## 8. MVP Assumptions and Extension Path

Close by explaining that RF lifetime and dust gain use replaceable packaged reference curves, propagation uses a rule-driven graph, links are abstract links, and service flows are service-level abstractions. Future versions can replace these with calibrated literature, lab, or high-fidelity simulation data.
