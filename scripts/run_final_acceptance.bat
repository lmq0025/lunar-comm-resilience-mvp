@echo off
setlocal

set ENV_PATH=E:\ProgramData\condaData\envs_dirs\lunar_comm_mvp

echo [1/8] Activating conda environment: %ENV_PATH%
set CONDA_BAT=E:\ProgramData\anaconda3\condabin\conda.bat
if not exist "%CONDA_BAT%" (
  echo Could not find conda.bat at %CONDA_BAT%.
  echo Please update CONDA_BAT in this script or run conda init.
  exit /b 1
)
call "%CONDA_BAT%" activate %ENV_PATH%
if errorlevel 1 (
  echo Failed to activate conda environment.
  exit /b 1
)

echo [2/8] Running pytest
pytest -q
if errorlevel 1 exit /b 1

echo [3/8] Running final demo
python -m lunar_comm_sim.app.cli run --scenario configs/default_scenario.yaml --out outputs/final_demo/demo_run
if errorlevel 1 exit /b 1

echo [4/8] Running healing ablation experiment
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/healing_ablation.yaml --out outputs/final_demo/experiments/healing_ablation
if errorlevel 1 exit /b 1

echo [5/8] Running isolated dust sweep
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/dust_sweep_isolated.yaml --out outputs/final_demo/experiments/dust_sweep_isolated
if errorlevel 1 exit /b 1

echo [6/8] Running relay handover sweep
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/relay_handover_sweep.yaml --out outputs/final_demo/experiments/relay_handover_sweep
if errorlevel 1 exit /b 1

echo [7/8] Running fast Monte Carlo
python -m lunar_comm_sim.app.cli experiment --scenario configs/default_scenario.yaml --experiment configs/experiments/main_hub_monte_carlo_fast.yaml --out outputs/final_demo/experiments/main_hub_monte_carlo_fast
if errorlevel 1 exit /b 1

echo [8/8] Generating final delivery documents
python scripts/generate_final_delivery_docs.py
if errorlevel 1 exit /b 1

echo.
echo Final acceptance complete.
echo Open dashboard with:
echo streamlit run lunar_comm_sim/app/dashboard.py

endlocal
