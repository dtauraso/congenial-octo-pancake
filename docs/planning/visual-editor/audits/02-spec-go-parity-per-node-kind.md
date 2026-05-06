### 2. Spec ↔ Go parity per node kind

**What it checks.** Each node kind in the editor produces Go that
matches the canonical hand-written equivalent (channel-name
convention, struct fields, goroutine launch, run-loop shape).

**Backed by.** Phase 8 chunks 1–11 cover every gate-shaped node
currently in scope. Tests live alongside `cmd/topogen/`.

**Passing.** Per-kind parity tests green for every kind touched by
a change.

**Cadence.** Per-PR on touched kinds. **Monthly full sweep** is a
good cadence to catch drift in untouched kinds.

**Cost.** CI compute; model review on red only.
