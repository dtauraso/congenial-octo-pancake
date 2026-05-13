# Next task: 2-input join node (commit 4 of slot-in-node)

**Branch:** `task/substrate-slot-in-node`.
**Status:** relay landed at `1ca6f9f`. Chain `input → relay →
readgate` works end-to-end with w1=cohort 0, w2=cohort 1. All
gates green. The next missing primitive is a node that owns more
than one input slot — until that lands, the substrate can't
express any firing rule that depends on coincidence (AND gates,
edge detectors, sync latches all need it).

## What to read

1. [MODEL.md](../../../MODEL.md) — slot phases and firing rules.
2. [Node.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Node.tsx)
   — slots are declared by id; `fill` re-invokes `onRun`, so a
   firing rule that reads two slots is just an `onRun` body.
3. [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
   — `RelayBody` is the template; the join is a strict superset.
4. [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
   — `assignCohorts` already does `max(predecessor cohorts) + 1`,
   so a join's outgoing wire's cohort is correct without changes.

## Target shape

- Register `join` in `NODE_KIND_PORTS` with `inputs: ["a", "b"]`,
  `outputs: ["out"]`.
- `JoinBody` declares slots `["a", "b"]` and an `onRun` that
  fires only when **both** slots are `filled` AND `outWire.canAccept`.
  On fire: `consume("a")`, `consume("b")`, `load(combine(va, vb))`.
  Use a simple combiner (e.g. `[va, vb]` tuple) — the model
  doesn't care about the payload shape yet.
- Wire `JoinBody` into [TopologyRoot.tsx](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx).

## Topology under test

Two inputs feeding one join feeding a readgate:

  `srcA → join.a` (cohort 0)
  `srcB → join.b` (cohort 0)
  `join.out → gate.in0` (cohort 1)

## Contract assertions

1. parseSpec: both input wires are cohort 0; join's outgoing wire
   is cohort 1.
2. After one `step`, the cursor is at 1 — both cohort-0 wires
   arrived, both join slots are/were filled, and the join's
   outgoing wire is now parked-on-gate at cohort 1 (readgate
   button still not armed).
3. After a second `step`, the readgate slot fills (button armed).
4. **Asymmetric case (recommended):** queue only `srcA`. After one
   step, slot `a` is `filled` but slot `b` is `empty`; the join
   does NOT emit. After a later step where `srcB` produces, the
   join finally fires. This is the firing-rule guarantee — the
   join is the first node where this matters.

## Latent hazards

- `Node.fill` re-invokes `onRun` on the destination only. If wire
  `a` arrives first, `onRun` runs but `b` is still empty → no-op.
  When `b` arrives, `onRun` runs again and now fires. Verify the
  test asserts the "first arrival does nothing" intermediate state.
- The join's outgoing wire is cohort 1 even when both inputs
  arrive in the same step. Park-on-gate semantics must hold —
  emission happens during cohort 0's run; the wire transitions to
  `in-flight` but `complete()` sees cohort 1 not yet released and
  subscribes. Mirrors the relay path.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` → `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.
- Pre-existing `topology.view.json` working-tree diff still untouched.

## ALWAYS clause

(See handoff.md — same clause applies.)
