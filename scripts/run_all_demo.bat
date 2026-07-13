@echo off
call conda activate E:\ProgramData\condaData\envs_dirs\lunar_comm_mvp

python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/demo_run

python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/healing_ablation.yaml --out outputs/experiments/healing_ablation

python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/dust_sweep_isolated.yaml --out outputs/experiments/dust_sweep_isolated

python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/relay_handover_sweep.yaml --out outputs/experiments/relay_handover_sweep

echo.
echo Optional fast Monte Carlo example:
echo python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/main_hub_monte_carlo_fast.yaml --out outputs/experiments/main_hub_mc_fast
echo.
echo Open dashboard with:
echo streamlit run lunar_comm_sim/app/dashboard.py
