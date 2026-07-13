"""Stochastic realization helpers for Monte Carlo experiments."""

from __future__ import annotations

import random
from copy import deepcopy
from typing import Any


def apply_stochastic_realization(
    raw_scenario: dict[str, Any],
    rng: random.Random,
    stochastic_config: dict[str, Any] | None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Sample stochastic link/node failures into a scenario copy."""

    config = stochastic_config or {}
    if not config.get("enabled", False):
        return deepcopy(raw_scenario), {
            "stochastic_enabled": False,
            "stochastic_failed_link_count": 0,
            "stochastic_failed_links": "",
        }

    mutated = deepcopy(raw_scenario)
    failed_links: list[str] = []
    sampled_kinds = set(config.get("sampled_link_kinds", []))
    if config.get("link_failure_sampling", False):
        for link in mutated.get("links", []):
            if link.get("kind") not in sampled_kinds:
                link["active"] = bool(link.get("active", True))
                continue
            availability = float(link.get("availability", 1.0))
            active = rng.random() <= availability
            link["active"] = active
            if not active:
                failed_links.append(f"{link.get('source')}->{link.get('target')}")

    return mutated, {
        "stochastic_enabled": True,
        "stochastic_failed_link_count": len(failed_links),
        "stochastic_failed_links": ";".join(failed_links),
    }
