# MVP Design

The MVP implements a traceable closed loop:

scenario configuration -> topology construction -> service simulation -> fault injection -> layered metrics -> self-healing -> before/after comparison -> report generation.

The simulation is intentionally parameterized rather than a high-fidelity protocol stack. Each model can later be replaced by detailed literature, field, or high-fidelity simulation data.
