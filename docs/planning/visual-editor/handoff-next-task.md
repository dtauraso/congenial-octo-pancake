# Next task: multi-cohort chain (commit 3 of slot-in-node)

**Branch:** `task/substrate-slot-in-node`.
**Status:** cohort gate + cursor driver landed locally (uncommitted
working tree). All gates green. The only topology shape that exercises
the substrate is `input → readgate` — a single wire at cohort 0.
Cohorts > 0 are unproven in practice.

## What to read

1. [MODEL.md](../../../MODEL.md) — "Ticks and stepping".
2. [cohort-gate.ts](../../../tools/topology-vscode/src/webview/substrate-r/cohort-gate.ts)
   and [useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts)
   to see how the cursor releases cohort N and waits.
3. [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
   — `assignCohorts` computes cohort during parseSpec.

## Target shape

- Add a chain-capable node kind (smallest viable: a `relay` that has
  one input slot `in0` and one output port `out`; on slot fill, emit
  the value downstream when its outgoing wire `canAccept`). Register
  it in `NODE_KIND_PORTS`.
- Build a 3-node spec `input → relay → readgate` (two wires; wire2's
  cohort should be 1).
- Contract test asserting:
  1. After one `step`, the cursor is at 1 and only wire1 fired —
     wire2's value is in-flight or parked, NOT arrived.
  2. After a second `step`, wire2 arrives and the readgate slot fills.
  3. Removing the second `step` and asserting wire2 stays in-flight
     (parked on gate) demonstrates park-in-gate semantics.

## Concrete starting steps

1. Add `relay` to `NODE_KIND_PORTS` in
   [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
   with `inputs: ["in0"]`, `outputs: ["out"]`.
2. Add a `RelayBody` in
   [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
   that subscribes to its `in0` slot; on `filled`, if its outgoing
   wire `canAccept`, `consume("in0")` and `load` the wire.
3. Wire `RelayBody` into [TopologyRoot.tsx](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx).
4. Add a smoke test variant with the 3-node chain.

## Latent hazards

- The driver's `cohortWires` filter is `wire.cohort === cursor`. If
  the relay's outgoing wire fires *during* cohort 0's run (because
  slot-fill re-invokes `onRun`), the wire will be in-flight under
  cohort 1 but the driver is still waiting on cohort 0. That's
  correct — cohort 0 closes when cohort-0 wires are empty, regardless
  of cohort-1 activity — but verify the test order makes that visible.
- Don't park values on the wire. If a relay's outgoing wire is loaded
  before cohort 1 is released, that's fine: the value sits in the
  wire's `in-flight` phase and the wire subscribes to the gate.

## Housekeeping (carry forward)

- Commit the cohort gate work still sitting in the working tree.
- Fix `check-substrate-vocab.mjs` path (still points at
  `substrate/`, the live dir is `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.

## ALWAYS clause

(See handoff.md — same clause applies.)
