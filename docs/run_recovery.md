# Run Recovery

Each API session still uses in-memory staged state while it is active. Round 6 persists the scenario snapshot, completed step names, validated step responses, and artifact manifest rows.

After a backend restart, a run can be restored through:

```http
POST /api/v1/runs/{run_id}/restore-session
```

Recovery replays deterministic completed steps from the persisted scenario snapshot into a fresh staged state. It does not pickle NetworkX graphs, Python locks, or arbitrary in-memory objects.

If a background job was `queued` or `running` during restart, startup marks it `interrupted`; the user can submit a new job for the next valid step.
