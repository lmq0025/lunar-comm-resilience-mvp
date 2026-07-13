# Final MVP Summary

## MVP Goal

This MVP evaluates resilience and self-healing behavior for a lunar-surface communication network through a traceable software loop: scenario configuration, topology construction, explicit service routing, fault injection, healing strategy execution, layered metric calculation, indicator checking, batch experiments, and report generation.

## Out of Scope

The MVP does not implement a real 5G protocol stack, high-fidelity electromagnetic propagation, real radio hardware control, orbital dynamics, or full packet-level network emulation. It is a research software scaffold for validating closed-loop evaluation logic and metric traceability.

## Implemented Minimum Closed Loop

`nominal_graph -> nominal_routes -> apply_faults -> faulted_graph with inherited routes -> apply_healing -> healed_graph with rerouted routes -> simulate_services -> calculate_metrics -> indicator_check`

The loop writes three-phase outputs for nominal, before-healing, and after-healing states, including route tables, service results, fault events, healing actions, metrics, indicator checks, topology figures, and Markdown reports.

## Research Content Mapping

The four research contents are mapped to software modules covering environmental influence modeling, layered indicator construction, lunar-specific fault propagation modeling, and resilient self-healing policy evaluation. See `research_task_mapping.md` for the module-level mapping.

## Verifiable Technical Indicators

The current demo verifies 14 technical indicators through a mixture of simulation-driven outputs, internal replaceable reference curves, and MVP benchmark checks. The authoritative final acceptance values are generated in `outputs/final_demo/demo_run/indicator_check.csv`, with `outputs/demo_run/indicator_check.csv` used only as a fallback during local development.

## MVP Simplifying Assumptions

The link, service, propagation, and physical-layer models are intentionally lightweight. RF lifetime and dust gain loss use packaged reference CSV curves. Fault propagation uses a rule-driven graph. Service flows are service-level abstractions rather than full protocol traffic.

## Upgrade Path

Future research versions can replace the internal reference curves with literature or lab data, upgrade propagation prediction to Bayesian networks or dynamic fault trees, connect higher-fidelity channel models, and add calibrated data from lunar communication studies or hardware-in-the-loop experiments.
