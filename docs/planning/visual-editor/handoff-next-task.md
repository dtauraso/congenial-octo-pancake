# Next task: verify source → wire → destination pulse behavior

**Branch:** `task/substrate-slot-in-node`.
**Status:** join landed at `79ede00`. Relay + multi-cohort chain at
`1ca6f9f`. Gates green: tsc clean, 123/123 tests, `check:loc` clean.

Fan-out (1→N distribute) is **deferred** — skipped from this branch.
The substrate currently dispatches one wire per output port (see
`findWireForOutput` in
[TopologyRoot.tsx](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx)),
and that's accepted as the working shape for now.

## The verification target

The same pulse behavior that worked before the slot-in-node rewrite
must still work now. Concretely: a value loaded at a source node
must travel along its outgoing wire and arrive at the destination's
slot exactly as it did under the old latch + AND-gate substrate.
No regression in the basic source → wire → destination path.

## What to do

1. Run the editor against the existing demo topologies and confirm
   pulses flow end-to-end. Drive the source, step the cohorts,
   watch the readgate arm.
2. Cross-check the contract test suite already covers the
   regressions you'd want — relay
   ([r-topology-relay test](../../../tools/topology-vscode/test/contracts))
   and join
   ([r-topology-join.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-join.test.tsx))
   together exercise the source → wire → destination pulse for
   single-input and 2-input destinations.
3. If any topology that worked pre-slot-in-node now misbehaves,
   capture the failing case as a contract test before fixing.

## What "working" means here

A pulse loaded at the source produces, after the expected number
of `step`s (= number of cohorts), a `filled` slot at the
destination carrying the same value. No extra steps, no dropped
pulse, no stuck `consumed` state.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` → `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.
- Pre-existing `topology.view.json` working-tree diff still untouched.

## ALWAYS clause

(See handoff.md — same clause applies.)
