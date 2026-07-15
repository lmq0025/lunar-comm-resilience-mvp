# Full Software Round 5: Healing and Indicator Verification

Round 5 opens the remaining backend-driven workflow steps in the React application while preserving the existing simulation algorithms and default scenario results.

## Goal

The user can now run the complete staged loop:

1. Build topology.
2. Calculate nominal routes.
3. Run nominal services.
4. Inject faults.
5. Analyze before-healing impact.
6. Execute non-routing healing.
7. Recalculate backup routes.
8. Run after-healing services.
9. Verify technical indicators and download artifacts.

## Healing Strategies

The catalog contains five implemented strategies:

- `priority_scheduling`: step 6, non-routing, protects `control_command` and `teleoperation`.
- `service_degradation`: step 6, non-routing, reduces `hd_video` demand to `degraded_bandwidth_mbps`.
- `store_and_forward`: step 6, non-routing, buffers `science_data`.
- `relay_pre_handover`: step 6, non-routing, reduces relay handover disturbance.
- `reroute_backup_path`: step 7, routing, recomputes active backup paths.

The frontend uses the backend catalog when available and provides an offline catalog with the same IDs, execution steps, categories, and implementation status.

## Why Step 6 And Step 7 Are Separate

Step 6 only executes non-routing actions. It may change service policy state or link parameters, but it does not recompute service paths. When `reroute_backup_path` is enabled, step 6 sets `pending_route_recalculation=true`; inherited nominal routes can remain invalid.

Step 7 is the only stage that may execute `reroute_backup_path`. If the strategy is disabled, step 7 verifies inherited routes with `route_source=healing_verified_inherited` and does not fabricate a recovery.

## After-Healing Simulation

Step 8 runs service simulation against backend after-healing routes and topology. The frontend displays service rows, route validity, route source, degradation state, metrics, and a three-stage comparison. The comparison is a UI aggregate derived from backend rows; it does not replace backend indicator checks.

## Indicator Verification

Step 9 verifies the configured technical indicators. Applicable, passed, failed, and not-applicable counts are reported separately. Not-applicable indicators are not counted as passed.

## Artifact Downloads

The backend exposes:

- `GET /api/v1/sessions/{session_id}/artifacts/files/{filename}`
- `GET /api/v1/sessions/{session_id}/artifacts/bundle`

Only filenames in `REQUIRED_OUTPUTS` are allowed. Path traversal, absolute paths, and arbitrary session-output files are rejected. The ZIP bundle includes only existing required artifacts.

## State Machine

The frontend keeps one session per project runtime. Scenario changes, including healing strategy changes, invalidate all steps because the backend session fixes scenario configuration at creation time. Visual-only changes such as tab switching and topology selection do not invalidate results.

## Tests

Round 5 adds backend checks for precise OpenAPI response models, step 6-9 semantics, reroute-disabled behavior, artifact download security, and full artifact bundles. Frontend tests cover the healing catalog and route-color priority.

## Known Limits

Sessions remain in process memory. Refreshing the browser loses runtime results. Batch experiment pages remain reserved. The frontend visualizes backend outputs but does not implement route or indicator algorithms.
