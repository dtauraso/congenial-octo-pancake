# Next task: lock the editor pulse path in a contract test, extend to relay/join

**Branch:** `task/substrate-slot-in-node`. Tip `05f0f5d`.
**Status:** Editor pulse verified live for input → readgate, and
pulses now follow edges through mid-flight geometry changes. Gates
green: tsc clean, 123/123 tests, `check:loc` clean.

## What just landed

- `05f0f5d` — Wire RAF effect now depends on `pathD`, so geometry
  changes mid-flight restart the RAF and pick up the new arc
  length. `distanceCoveredRef` preserves progress across restart,
  so the pulse resumes at the same arc distance on the new path.
  Symptom before the fix: pulse traveled a fixed (old) distance
  and vanished when the edge was lengthened mid-flight.
- `ef5db1a` — `ReadGateBody`/`RelayBody`/`JoinBody` accept
  `slotId` (and `slotAId`/`slotBId` for join) as props with
  defaults preserving the contract-test literals (`"in0"`, `"a"`,
  `"b"`). `RSubstrateNode` passes `inputs[i].name` from the
  schema's node-types. Fixes the `chainIn`/`in0` mismatch that
  crashed the driver mid-step.

## Next moves (pick in order of friction)

1. **Lock the regression.** Add a contract test that reproduces
   the editor scenario: a readgate whose schema input port is
   *not* `"in0"` (e.g. `"chainIn"`). Today's tests only cover the
   `"in0"` default. The contract test goes under
   `test/contracts/r-topology-*.test.tsx`. This is what catches
   any future regression of the slot-id thread. Optional companion
   test: mid-flight `pathD` change preserves pulse progress and
   completes at the new arc length (`05f0f5d`).
2. **Multi-hop in the editor.** Drop a relay between input and
   readgate (or a join with two inputs) and step through. Confirm
   cohort 0 fires, then cohort 1, etc., and the readgate's ⌫ arms
   only after the final pulse arrives.
3. **If it parks anywhere**, capture the failing topology as a
   contract test *before* fixing.

## Suspect zones if multi-hop parks

- Cohort math: `assignCohortsForEdges` is parseSpec-free but
  assumes a DAG. A cycle hits the `visiting` guard and returns 0.
- Driver advance: `useTickDriver.advance` watches the current
  cohort's wires for `empty`; if a destination slot stays
  `filled` because no body consumes it, the cursor never
  advances.
- A new kind whose `*Body` was added to `node-kinds.tsx` and
  `TopologyRoot` but not to `RSubstrateNode` — exactly the drift
  CLAUDE.md's landing rule prohibits.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` →
  `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved
  deletion.
- Remember to `npm run build` after substrate-r edits — the
  webview bundle is not rebuilt on tsc/vitest alone, and a stale
  `out/webview.js` is what made the prior "no pulse after
  reload" symptom appear.

## ALWAYS clause

(See handoff.md — same clause applies.)
