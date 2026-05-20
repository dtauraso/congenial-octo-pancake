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
| ReadGate | 2 → 1 (value+ack / gated) | Buffer both; emit value when both arrive. | topology: 1; docs: 1 | SyncGate, Join | ✅ **keep**. |
| ChainInhibitor | 1 → 4 (prev / next+edge+new+ack) | Block on prev; emit old to ToEdge/ToNext, new to ToEdgeNew, 1 to ToAck. | topology: 2; docs: 2 | Inhibitor | ✅ **keep** — superset; fan-out + ack. |
| InhibitRightGate | 2 → 1 (left+right / passed) | Emit 1 if left==1 AND right==0. | topology: 1; docs: 1 | AndGate | ✅ **keep**. |

## Findings (haiku sweep, 2026-05-19)

**Tally:** keep 4, delete 12, defer 0 (16 total).

- ✅ **Keep:** Input, ReadGate, ChainInhibitor, InhibitRightGate.
- 🗑️ **Deleted:** Relay, Join, Inhibitor, EdgeInhibitor, TransferInhibitor, StreakDetector, StreakBreakDetector, ReadLatch, SyncGate, AndGate, EdgeNode, Partition.

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
