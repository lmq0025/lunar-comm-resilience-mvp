# Model Assumptions

- Links are modeled as undirected edges with bandwidth, delay, loss, and availability attributes.
- Environmental effects modify link health through simple deterministic formulas.
- Faults are injected as scenario-level degradations.
- Self-healing policies adjust topology, service demand, buffering behavior, and handover disturbance.
- Results are meant for MVP verification, not protocol certification.
- Service simulation uses explicit per-stage routing tables. The `before_healing` phase validates inherited nominal routes and does not automatically recompute shortest paths.
- The MVP keeps two Ka availability definitions: `ka_configured_channel_availability` averages every configured surface-to-orbit and orbit-to-ground link, counting inactive links as zero; `ka_active_path_availability` averages Ka-class links actually used by valid service routes. The acceptance metric `ka_channel_availability` currently uses the active-path definition.
