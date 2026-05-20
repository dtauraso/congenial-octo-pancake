# Kind Audit & Consolidation

**Branch:** `task/kind-audit-consolidation`
**Status:** open

## Goal

Shrink the substrate kind set. Every kind costs: a Go body, a SPEC.md,
a `main.go` blank import, an entry in the generated `node-defs.ts`, and
mental load when reasoning about wiring. Some current kinds are likely
dead, redundant, or merge-able. Cutting them compounds across every
future infra refactor.

This is a prerequisite to further infra cuts (struct-tag populates, Go
AST → ports, etc.); doing infra on dead kinds is wasted work.

## Method

Per-kind, gather:

- **Ports** (from `nodes/<Kind>/<Kind>.go` channel fields).
- **One-line firing rule** (from `SPEC.md` pseudocode).
- **Used in `topology.json`?** Count of instances.
- **Used in any other reference topology** under `docs/`, `examples/`,
  fixtures? List paths.
- **Overlap candidates**: kinds with same port shape OR same firing
  rule modulo a flag.

Then for each kind decide:

- **keep** — distinct firing rule, in use.
- **merge into X** — same shape as X with a flag; collapse.
- **delete** — unused and no plan to use.
- **defer** — has a future use; keep for now, revisit.

## Suspects (a priori)

Worth scrutinizing before the audit table is filled:

- **Relay, Join** — editor-only, no Go body. Relay is 1-in-1-out
  passthrough (equivalent to a wire). Join might be subsumed by any
  two-input kind.
- **Inhibitor, ChainInhibitor, EdgeInhibitor, TransferInhibitor** —
  four inhibitor variants. Probably two distinct shapes behind four
  names.
- **StreakDetector vs StreakBreakDetector** — symmetric pair; could
  collapse to one with an inversion flag.
- **ReadGate, ReadLatch, SyncGate** — three two-input-one-output gates
  differing only in timing/buffering. May collapse.

## Audit table

| Kind | Ports (in → out) | Firing rule (one line) | Usages | Overlap | Decision |
|------|------------------|------------------------|--------|---------|----------|
| Input | 0 → 1 (ToNext) | Poll init queue; forward once; clear on send. | topology: 2; docs: 1 | — | ✅ **keep** — source node. |
| Relay | 1 → 1 | Pass-through. | 0 | wire, Join | 🗑️ **deleted (2026-05-19)** — 1-in-1-out ≡ wire; editor-only, unused. |
| Join | 2 → 1 | Buffer both; emit once both arrive. | 0 | ReadGate, SyncGate | 🗑️ **deleted (2026-05-19)** — editor-only, unused; semantics subsumed by ReadGate. |
| Inhibitor | 2 → 3 (prev+edge / next+edge+gate) | Block on prev; emit held+new; forward chain. | 1 code ref | ChainInhibitor | 🗑️ **deleted (2026-05-20)** — superset already in use as ChainInhibitor. |
| ChainInhibitor | 1 → 4 (prev / next+edge+new+ack) | Block on prev; emit old to ToEdge/ToNext, new to ToEdgeNew, 1 to ToAck. | topology: 2; docs: 2 | Inhibitor | ✅ **keep** — superset; fan-out + ack. |
| EdgeInhibitor | 1 → 1 (prev / edge) | Block on prev; forward to edge (no buffer). | 1 code ref | ChainInhibitor | 🗑️ **deleted (2026-05-20)** — unused; ChainInhibitor superset. |
| TransferInhibitor | chan-of-chan → 1 | Block on TransferIn; store as EndTo; forward if set. | 1 code ref | — | 🗑️ **deleted (2026-05-20)** — specialized partition-end forwarding; unused. |
| StreakDetector | 2 → 2 (old+new / done+streak) | Emit 1 on Done; emit 1/0 on Streak if sign same/diff. | 1 code ref | StreakBreakDetector | 🗑️ **deleted (2026-05-20)** — unused; symmetric inverse of StreakBreakDetector still available if needed. |
| StreakBreakDetector | 2 → 1 (old+new / done) | Emit 1 if sign(old)≠sign(new). | 1 code ref | StreakDetector | 🗑️ **deleted (2026-05-20)** — unused. |
| ReadGate | 2 → 1 (value+ack / gated) | Buffer both; emit value when both arrive. | topology: 1; docs: 1 | SyncGate, Join | ✅ **keep**. |
| ReadLatch | 2 → 2 (in+release / next+ack) | FromIn buffers; FromRelease emits held+ack. | 2 code refs | — | 🗑️ **deleted (2026-05-20)** — release-trigger semantics unused. |
| SyncGate | 2 → 1 | Buffer both; emit 1 unconditionally. | 1 code ref | ReadGate | 🗑️ **deleted (2026-05-20)** — unused; semantics subsumed by ReadGate. |
| AndGate | 2 → 1 | Emit 1 if a==1 AND b==1. | 1 code ref | InhibitRightGate | ✅ **keep**. |
| InhibitRightGate | 2 → 1 (left+right / passed) | Emit 1 if left==1 AND right==0. | topology: 1; docs: 1 | AndGate | ✅ **keep**. |
| EdgeNode | 2 → 3 (left+right / inhibitor+partition+next) | XOR; fan out identically. | 0 | AndGate, InhibitRightGate | 🗑️ **delete** — unused; fan-out replaceable by direct wiring. |
| Partition | 1 → 1 | State machine 0→1→2; emit 1 on 0→1, 0 on 1→2. | 4 code refs | — | ✅ **keep**. |

## Findings (haiku sweep, 2026-05-19)

**Tally:** keep 6, merge 1, delete 9, defer 0 (16 total).

- ✅ **Keep:** Input, ChainInhibitor, ReadGate, AndGate, InhibitRightGate, Partition.
- 🔀 **Merge:** SyncGate → ReadGate (flag).
- 🗑️ **Delete:** Relay (≡ wire, unused), Join (editor-only, unused; subsumed by ReadGate), Inhibitor (superset already in use as ChainInhibitor), EdgeInhibitor (subset of ChainInhibitor, unused), EdgeNode (unused; XOR fan-out replaceable), TransferInhibitor (specialized partition-end forwarding; unused), StreakDetector (unused; symmetric inverse of StreakBreakDetector), StreakBreakDetector (unused).
- ⏸️ **Defer:** (none).

**Surprises:**
- Relay is literally a 1-in-1-out passthrough — indistinguishable from the wire itself.
- Inhibitor has only one code reference (likely stale relative to ChainInhibitor).
- StreakDetector / StreakBreakDetector are exact logical inverses.
- SyncGate and ReadGate both wait for two inputs; SyncGate ignores values.
- EdgeNode's three outputs carry the same XOR value — fan-out via wiring would do.

Usage counts are from the agent's grep sweep; verify per-kind before any deletion lands.

## Results

- 🗑️ **Relay** — deleted 2026-05-19 on `task/kind-audit-consolidation`. SPEC.md removed; dropped from `RUNTIME_IMPLEMENTED_KINDS` and `NODE_TYPES`; `node-defs.ts` regenerated.
- 🗑️ **Join** — deleted 2026-05-19 on `task/kind-audit-consolidation`. SPEC.md removed; dropped from `RUNTIME_IMPLEMENTED_KINDS`; `node-defs.ts` regenerated.
- 🗑️ **Inhibitor** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; dropped from `RUNTIME_IMPLEMENTED_KINDS`; `node-defs.ts` regenerated.
- 🗑️ **EdgeInhibitor** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated.
- 🗑️ **TransferInhibitor** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated.
- 🗑️ **StreakDetector** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated.
- 🗑️ **StreakBreakDetector** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated; fixture parity test removed.
- 🗑️ **ReadLatch** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated; fixture parity tests removed (FixtureParity_ReadLatch_test.go and FixtureParity_test.go which wired ReadLatch as integration harness).
- 🗑️ **SyncGate** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; dropped from `node-types.ts`; `node-defs.ts` regenerated; fixture parity test removed.

## Migration plan template

For each `delete` or `merge`:

- **Topology.json migration** — script or hand-edit to remove/rename
  affected instances. Must run before the Go body is removed or the
  loader will throw `unknown node kind`.
- **SPEC.md disposition** — for merged kinds, the absorbing kind's
  SPEC absorbs the flag; the dissolved SPEC is deleted.
- **Editor migration** — `node-defs.ts` regenerates automatically;
  no manual TS edit unless a kind is added.

## Out of scope

- Adding new kinds. This pass only subtracts.
- Renaming kept kinds.
- Refactoring firing rules. If a rule is genuinely subtle and worth
  keeping, leave it alone.

## Constraints

- Do not break the currently-running `topology.json`. Either migrate
  it in the same commit as the kind change, or land the kind change
  behind a flag.
- Generated artifacts (`node-defs.ts`) re-emit from SPEC.md changes;
  don't hand-edit.
- One kind decision per commit so each is independently revertable.
