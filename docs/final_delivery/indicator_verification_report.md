# Indicator Verification Report

This report is generated from `outputs/final_demo/demo_run/indicator_check.csv`.

Actual demo output directory: `outputs/final_demo/demo_run`.

| Indicator | Threshold | Demo Actual | Status | Verification Method | Output File | Evidence Type |
| --- | --- | --- | --- | --- | --- | --- |
| RF lifetime prediction error | <= 10.0 % | 3.9060287178272883 % | passed | MVP physical model compared with internal replaceable reference curve | `indicator_check.csv` / `metrics_summary.csv` | MVP internal reference |
| Lunar dust antenna gain loss quantification error | <= 5.0 % | 3.0000000000000044 % | passed | MVP physical model compared with internal replaceable reference curve | `indicator_check.csv` / `metrics_summary.csv` | MVP internal reference |
| Main-hub failure subnet paralysis probability | <= 0.01 ratio | 0.0 ratio | passed | MVP topology and service reachability simulation | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Relay handover end-to-end delay disturbance | <= 50.0 ms | 35.0 ms | passed | MVP handover fault and healing model | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Ka-band channel availability | >= 0.995 ratio | 0.9982700000000001 ratio | passed | MVP link model | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Route convergence time | <= 50.0 ms | 35.0 ms | passed | reroute_backup_path healing action | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| URLLC command packet loss rate | <= 1e-05 ratio | 9.804126360011267e-06 ratio | passed | MVP service simulation | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| HD video return success rate | >= 0.999 ratio | 0.9999447319008038 ratio | passed | MVP service simulation with degradation policy | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Fault-mode library coverage | >= 8.0 count | 10.0 count | passed | coded fault library | `indicator_check.csv` / `metrics_summary.csv` | MVP benchmark |
| Cascading fault prediction accuracy | >= 0.9 ratio | 1.0 ratio | passed | MVP fault propagation graph prediction compared with simulated observed impacts | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Fault propagation delay quantification error | <= 15.0 % | 1.4848667435828018 % | passed | MVP fault propagation graph prediction compared with simulated observed impacts | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Service degradation decision time | <= 200.0 ms | 120.0 ms | passed | service_degradation healing action | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Resource contention resolution rate | >= 0.95 ratio | 1.0 ratio | passed | protected congested-service scheduling result | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
| Science data return interruption | <= 1.0 s | 0.45499999999999996 s | passed | store-and-forward simulation | `indicator_check.csv` / `metrics_summary.csv` | simulation-driven |
