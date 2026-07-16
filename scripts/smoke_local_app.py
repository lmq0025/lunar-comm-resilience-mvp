"""Round 6.1 API smoke test for a running local production service."""

from __future__ import annotations

import argparse
from pathlib import Path
from uuid import uuid4

import httpx
import yaml


STEP_PATHS = (
    "build-topology",
    "calculate-routes",
    "run-nominal",
    "inject-faults",
    "analyze-fault-impact",
    "execute-healing",
    "recalculate-routes",
    "run-after-healing",
    "verify-indicators",
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")
    root = Path(__file__).resolve().parents[1]
    scenario = yaml.safe_load((root / "configs" / "default_scenario.yaml").read_text(encoding="utf-8"))

    with httpx.Client(base_url=base_url, timeout=60.0) as client:
        assert_ok(client.get("/api/v1/health"), "health")
        home = client.get("/")
        assert home.status_code == 200 and "text/html" in home.headers.get("content-type", "")
        api_missing = client.get("/api/v1/not-found")
        assert api_missing.status_code == 404 and "application/json" in api_missing.headers.get("content-type", "")

        name = f"Round 6.1 smoke {uuid4().hex[:8]}"
        created = assert_ok(client.post("/api/v1/projects", json={"name": name, "scenario": scenario, "editor": {}}), "create project")
        project_id = created["project_id"]
        listed = assert_ok(client.get("/api/v1/projects"), "list projects")
        assert any(item["project_id"] == project_id for item in listed["projects"])
        opened = assert_ok(client.get(f"/api/v1/projects/{project_id}"), "open project")
        updated = assert_ok(client.put(f"/api/v1/projects/{project_id}", json={"expected_revision": opened["revision"], "description": "updated by smoke"}), "update project")
        assert updated["revision"] == opened["revision"] + 1
        copied = assert_ok(client.post(f"/api/v1/projects/{project_id}/copy", json={"name": f"{name} copy"}), "copy project")
        assert_ok(client.delete(f"/api/v1/projects/{copied['project_id']}"), "delete copied project")

        session = assert_ok(client.post("/api/v1/sessions", json={"scenario": scenario, "project_id": project_id, "project_revision": updated["revision"]}), "create session")
        session_id = session["session_id"]
        final = None
        for step in STEP_PATHS:
            final = assert_ok(client.post(f"/api/v1/sessions/{session_id}/steps/{step}"), step)
        assert final is not None
        result = final["step_result"]
        assert result["applicable_count"] == 14
        assert result["passed_count"] == 14
        assert result["failed_count"] == 0
        manifest = assert_ok(client.get(f"/api/v1/sessions/{session_id}/artifacts"), "artifact manifest")
        assert len(manifest["artifacts"]) == 16
        assert all(item["exists"] for item in manifest["artifacts"])

    print("Smoke passed: health, SPA/API routing, project CRUD, nine steps, 14/14 indicators, 16 artifacts")
    return 0


def assert_ok(response: httpx.Response, operation: str):
    if not response.is_success:
        raise AssertionError(f"{operation} failed: HTTP {response.status_code} {response.text}")
    return response.json()


if __name__ == "__main__":
    raise SystemExit(main())
