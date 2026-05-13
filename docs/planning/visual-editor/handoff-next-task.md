# Next task: pulse readgate → i0 → i1 → readgate around the cycle

**Branch:** `task/substrate-slot-in-node`. Working-tree changes
(uncommitted at write time): cohort assignment is now
wire-creation-order based and accepts cycles; readgate output arity
is variable; live rig closes a cycle.
**Status:** cycle parses and renders in the editor. It does not
*pulse* yet — `readgate`'s firing rule consumes its input slots but
does not load its new `out` port.

## What just landed (working tree)

- [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
  `assignCohorts` rewritten: iterate wires in spec-array order, each
  wire's cohort = `max(prior incoming wires on its source node) + 1`,
  or 0. No DFS, no cycle throw. Matches MODEL.md "cohort assigned at
  wire-time"; back-edges naturally get the highest cohort.
- Same file: readgate output arity relaxed from fixed-0 to
  variable-arity (`0..N`), mirroring the existing input variable-arity.
- [r-parse-cohort.test.ts](../../../tools/topology-vscode/test/contracts/r-parse-cohort.test.ts)
  adds a 4-wire cycle test (readgate → i0 → i1 → readgate, plus
  input → readgate) asserting cohorts `[0, 1, 2, 3]` and no throw.
- [topology.json](../../../topology.json): added `i0`
  (ChainInhibitor, default outputs), readGate1 gets instance output
  `out`, plus edges `readGate1.out → i0.in` and `i0.out → i1.in`.
  The cycle is closed by the pre-existing `i1.out → readGate1.chainIn2`.
- Editor renders the loop after reload; previous crash was a stray
  `"side": "top"` on the readGate output (schema only accepts
  `left|right`).

## Next move

**Teach `readgate` to load its `out` port when it fires.** Currently
`ReadGateBody` in
[node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
arms an AND over input slots and consumes them on click; it never
touches the output wire. For the cycle to pulse, the firing rule
must load `out` (value = ?) when all inputs are `filled` and the
`out` wire's `canAccept` is true. Land on both paths per the
substrate primitive landing rule:

1. **Test path:** add a `TopologyRoot` contract test driving
   in → readgate → i0 (one downstream step) and asserting the
   readgate's `out` wire transitions to `filled`.
2. **Editor path:** `RSubstrateNode` already dispatches readgate
   via the shared body, so the editor pulse follows once the body
   loads `out`.

Open design question to settle before coding: what value does
readgate's `out` carry? Options: (a) a fixed `1` (gate-fired
signal), (b) the value of one of the input slots (which one?),
(c) a tuple/struct. Pick the simplest that lets the cycle
demonstrate sustained activity.

## Suspect zones

- Cohort assignment is now order-sensitive on the wires array. If
  the editor reorders wires on save, cohorts can shift. Check that
  the save path preserves wire order.
- Readgate body subscribes to slot phases; once it also writes `out`,
  it needs to re-evaluate when the *output* wire drains too, not
  just on input phase changes. Mirror the `canEmit` pattern in
  `ChainInhibitorBody`.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` →
  `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.
- `⇢` button on ChainInhibitor stays until the cycle pulses
  end-to-end automatically; then revisit.
- Run `npm run build` after substrate-r / RSubstrateNode edits.

## ALWAYS clause

(See handoff.md — same clause applies.)
