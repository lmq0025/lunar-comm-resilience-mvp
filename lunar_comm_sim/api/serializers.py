"""API serialization helpers with strict JSON-safe values."""

from __future__ import annotations

import dataclasses
import math
from pathlib import Path
from typing import Any


def json_safe(value: Any) -> Any:
    """Recursively convert Python objects into strict JSON-compatible data."""

    if dataclasses.is_dataclass(value):
        return json_safe(dataclasses.asdict(value))
    if isinstance(value, Path):
        return value.as_posix()
    if isinstance(value, float):
        if math.isfinite(value):
            return value
        if math.isnan(value):
            return {"value": None, "value_status": "nan"}
        if value > 0:
            return {"value": None, "value_status": "positive_infinity"}
        return {"value": None, "value_status": "negative_infinity"}
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(item) for item in value]
    return value
