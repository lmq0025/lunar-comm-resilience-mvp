"""Wait until the local FastAPI health endpoint returns a valid response."""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request


def wait_for_health(url: str, timeout_s: float = 30.0, interval_s: float = 0.25) -> dict:
    deadline = time.monotonic() + timeout_s
    last_error = "health endpoint did not respond"
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=min(2.0, timeout_s)) as response:
                if response.status != 200:
                    last_error = f"HTTP {response.status}"
                else:
                    payload = json.loads(response.read().decode("utf-8"))
                    if payload.get("status") == "ok":
                        return payload
                    last_error = f"unexpected status: {payload.get('status')!r}"
        except (OSError, ValueError, urllib.error.URLError) as exc:
            last_error = str(exc)
        time.sleep(interval_s)
    raise TimeoutError(f"health check timed out: {last_error}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--timeout", type=float, default=30.0)
    args = parser.parse_args()
    try:
        payload = wait_for_health(args.url, timeout_s=args.timeout)
    except TimeoutError as exc:
        print(exc)
        return 1
    print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
