"""Command-line entry point for the MVP."""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console

from lunar_comm_sim.experiments.experiment_runner import run_experiment
from lunar_comm_sim.sim.engine import run_simulation

app = typer.Typer(help="Lunar communication resilience simulation MVP.")
console = Console()


@app.command()
def run(
    scenario: Path = typer.Option(..., "--scenario", help="Path to the scenario YAML file."),
    out: Path = typer.Option(..., "--out", help="Directory for generated results."),
) -> None:
    """Run the full resilience and self-healing simulation loop."""

    result = run_simulation(scenario, out)
    applicable = [row for row in result["indicators"] if row.get("applicable", True)]
    passed = sum(1 for row in applicable if row.get("status") == "passed" or row.get("passed"))
    console.print(f"Simulation complete: {passed}/{len(applicable)} applicable indicators passed")
    console.print(f"Results written to: {Path(out).resolve()}")


@app.command()
def experiment(
    scenario: Path = typer.Option(..., "--scenario", help="Path to the base scenario YAML file."),
    experiment: Path = typer.Option(..., "--experiment", help="Path to the experiment YAML file."),
    out: Path = typer.Option(..., "--out", help="Directory for generated experiment results."),
) -> None:
    """Run a batch experiment from an experiment YAML file."""

    result = run_experiment(scenario, experiment, out)
    rows = result.get("rows", [])
    console.print(f"Experiment complete: {len(rows)} runs")
    console.print(f"Results written to: {Path(out).resolve()}")


@app.command(hidden=True)
def version() -> None:
    """Keep the CLI in explicit subcommand mode and print a lightweight version."""

    console.print("lunar-comm-resilience-mvp 0.1.0")


if __name__ == "__main__":
    app()
