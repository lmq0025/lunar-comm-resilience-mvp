# Round 5 Experiment Statistics And Dashboard

## Statistical Fixes

Round 5 separates finite values from all observed values. Finite values are used for mean, standard deviation, min, max, and percentiles. All values are used for pass rates, failed counts, and non-finite counts.

## Why Inf Must Fail Pass Rate

An infinite route convergence time means the route did not converge. Ignoring it would overestimate pass rate, especially in no-healing ablation cases.

## Stochastic Monte Carlo Sampling

Monte Carlo experiments can enable stochastic link failure sampling. For each configured sampled link kind, the run samples `random() <= link.availability`. Failed links are written as `active=false` into that run's in-memory scenario.

## Risk Estimate

`estimated_subnet_paralysis_risk` is the fraction of Monte Carlo runs where after-healing `subnet_paralysis_probability > 0.01`.

## Wilson 95% CI

The Wilson interval provides a binomial confidence interval for the observed failure proportion. If the observed risk is zero, the upper confidence bound is still nonzero unless the sample is infinitely large.

## Dust Sweep Variants

`dust_sweep_isolated` disables main hub failure, buffer overflow, and relay handover delay so dust effects on physical-layer metrics are visible. `dust_sweep_full_mission` keeps the default mission faults and shows end-to-end service effects.

## Dashboard Tabs

- MVP Overview: project goal, module mapping, output path, indicator pass count.
- Single Scenario Closed Loop: topology images, metrics, service routes, service results.
- Faults and Healing: fault events, healing actions, response times.
- Indicator Verification: grouped technical indicator checks and benchmark notes.
- Batch Experiments: runs, summary, Monte Carlo risk, reports, and plots.

## MVP Benchmark Metrics

RF lifetime prediction error, dust gain-loss quantification error, cascading fault prediction accuracy, and fault propagation delay error remain MVP benchmark metrics.

## Performance Notes

Batch experiments default to in-memory scenario execution and avoid writing each run's scenario or report. Saving per-run scenarios is useful for debugging but increases runtime and disk usage. A 1000-run Monte Carlo is intended for formal validation runs rather than pytest.

## Future Integration

The experiment framework can ingest literature distributions, high-fidelity RF propagation outputs, orbital link windows, queueing simulations, or hardware-in-the-loop measurements as replacement parameter sources.
