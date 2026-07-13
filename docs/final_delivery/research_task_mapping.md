# Research Task Mapping

| Research Content | Software Modules | Primary Outputs | Verification Role |
| --- | --- | --- | --- |
| 1. Modeling influence factors for lunar communication network availability | `environment.py`, `link_model.py`, `physical_models.py`, `data/baselines` | `physical_model_validation.csv`, `physical_model_metrics.csv`, physical-layer rows in `metrics_summary.csv` | Models dust, radiation, temperature, Ka channel availability, RF lifetime, and antenna gain loss assumptions |
| 2. Building a layered availability indicator system | `metrics.py`, `configs/default_scenario.yaml` `technical_indicators`, `indicator_check.csv` | `metrics_summary.csv`, `indicator_check.csv` | Converts simulated and benchmark metrics into pass/fail/not-applicable technical indicator checks |
| 3. Analyzing and modeling lunar-environment-specific fault modes and propagation | `faults.py`, `propagation.py` | `fault_events.csv`, `fault_propagation_predictions.csv`, `observed_impacts.csv`, `fault_propagation_comparison.csv` | Captures main-hub failure, dust degradation, handover delay, congestion, radiation CPU lock, and propagation prediction accuracy |
| 4. Researching fault-tolerant self-healing strategies for lunar communication networks | `healing.py`, `routing.py`, `services.py` | `healing_actions.csv`, `service_routes.csv`, `service_results.csv` | Evaluates rerouting, priority scheduling, service degradation, store-and-forward, and relay pre-handover effects |
