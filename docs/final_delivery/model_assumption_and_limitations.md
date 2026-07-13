# Model Assumptions and Limitations

- RF lifetime validation uses an MVP built-in replaceable reference curve in `data/baselines/rf_lifetime_reference.csv`.
- Dust gain loss validation uses an MVP built-in replaceable reference curve in `data/baselines/dust_gain_reference.csv`.
- The propagation graph is an MVP rule-based propagation model. It can later be upgraded to a Bayesian network, dynamic fault tree, or data-driven propagation model.
- The link model is an abstract link model, not a real 5G protocol stack.
- Service flows are packet-level or service-level abstractions, not complete network protocol simulations.
- Ka-channel availability currently uses configured and active-path availability definitions documented in the model assumptions and demo reports.
- Monte Carlo and sweep experiments validate sensitivity and repeatability, but their distributions remain configurable MVP assumptions until calibrated with external data.
