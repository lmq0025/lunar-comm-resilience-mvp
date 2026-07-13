# Round 7 Physical Model Validation

## Why Replace RF And Dust Benchmarks

Earlier rounds used fixed benchmark values for RF lifetime prediction error and dust-induced antenna gain-loss error. Round 7 replaces those fixed values with model predictions compared against replaceable internal reference curves.

## RF Lifetime Model

The MVP model uses:

`lifetime = L0_h * f_T(temperature_c) * f_R(radiation_level) * model_bias`

`f_T` is an exponential temperature correction and `f_R` is a radiation degradation correction. The model is intentionally lightweight and parameterized through `physical_model_config`.

## Dust Gain Loss Model

The dust model uses:

`gain_loss_db = (linear_coeff * dust_level + quadratic_coeff * dust_level^2) * model_bias`

The reference curve is monotonic and nonlinear.

## Internal Reference Curves

The CSV files under `data/baselines/` are MVP internal reference curves. They are not certification-grade physical data and can later be replaced by literature, lab test, or high-fidelity simulation data.

## Output Interpretation

`physical_model_validation.csv` lists model inputs, predicted values, reference values, relative error, target error, and pass/fail status.

`physical_model_metrics.csv` exports the metric values consumed by `indicator_check.csv`.

## Propagation Observation Delay

Fault propagation observed delay is now derived from `fault_propagation.observation_model`. It is no longer copied directly from the prediction graph, so delay error is nonzero and configurable.

## Remaining MVP Simplifications

The RF and dust models are deterministic parametric approximations. They do not model detailed RF components, antenna contamination geometry, orbital visibility, or electromagnetic propagation.
