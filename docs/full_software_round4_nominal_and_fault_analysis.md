# Full Software Round 4: Nominal Run And Fault Analysis

## Goal

Round 4 opens staged steps 3, 4, and 5 in the complete software workflow:

1. Build topology
2. Calculate nominal routes
3. Run nominal state
4. Inject faults
5. Analyze fault impact

Steps 6-9 remain backend-protected and are not exposed in the frontend in this round.

## Snapshot Semantics

The current backend is a staged snapshot engine, not a continuous time-driven discrete-event simulator. The fault timeline configures `start_s` and `duration_s` and shows where planned events sit in the scenario duration. Pressing “Inject faults” applies all enabled configured faults once to the `before_healing` snapshot.

The UI explicitly labels this as snapshot mode. It does not animate faults as if time were continuously advancing.

## API Contracts

Round 4 adds precise response models for:

- `RunNominalStepResponse`
- `InjectFaultsStepResponse`
- `AnalyzeFaultImpactStepResponse`
- `ServiceSimulationResultResponse`
- `MetricRowResponse`
- `FaultRecordResponse`
- `FaultImpactSummaryResponse`
- propagation prediction, observation, comparison, and metric rows

Strict JSON serialization is retained. Non-finite values are represented as:

```json
{"value": null, "value_status": "positive_infinity"}
```

with equivalent statuses for `negative_infinity` and `nan`.

## Fault Model

Fault events now support:

```yaml
enabled: true
```

The field defaults to `true`, so existing YAML files remain compatible. A fault event is applied only when both conditions hold:

- the event has `enabled: true`
- its type is present in `faults.enabled`

The fault catalog now reports `target_scope`, `implementation_status`, and `implemented_effect`. Registered-only faults are visible but clearly marked as not having a dedicated MVP degradation effect.

## Frontend Workflow

The “Simulation Run” page uses the same session and state store as the service-routing page. It adds:

- a five-step step bar
- fault CRUD and enable/disable controls
- a fault timeline over `0..scenario.duration_s`
- nominal services, metrics, physical model validation, and routes
- fault records, before-healing topology summary, and inherited routes
- nominal-vs-fault service comparison
- metric deltas and fault propagation analysis

The before-healing route table displays inherited nominal routes. It does not compute backup routes and does not execute healing.

## Result Lifecycle

Simulation-affecting changes invalidate staged results:

- node/link structural or parameter changes
- service changes
- fault plan changes
- environment/model parameter changes
- project switch or import

Layout-only changes do not invalidate results:

- moving nodes
- auto layout
- viewport changes
- selection changes

This is implemented by comparing topology/editor changes with node positions excluded from the simulation signature.

## Tests

Backend tests cover:

- precise OpenAPI response models for steps 3-5
- non-finite service delay serialization
- fault `enabled` backward compatibility
- disabled fault events being skipped
- default scenario first five steps
- fault catalog metadata

Frontend tests cover:

- stage 3-5 store calls and result persistence
- fault CRUD and invalidation
- layout-only edits preserving runtime results
- link delay edits invalidating runtime results
- non-finite value display
- simulation page rendering

## Known Limits

- The frontend does not expose steps 6-9.
- The timeline is a configuration visualization, not a dynamic event playback engine.
- Faulted topology is summarized in the Round 4 page; detailed graph inspection can be expanded in later rounds.
