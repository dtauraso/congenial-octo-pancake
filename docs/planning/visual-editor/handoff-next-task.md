# Next task: multi-hop pulse in the editor (relay, join)

**Branch:** `task/substrate-slot-in-node`. Tip `42c9ec9`.
**Status:** Non-`in0` readgate slot is now locked by a contract test
(`r-topology-readgate-port`). The editor/test paths agree on slot-id
threading via the new per-node `ports` override on `RNodeSpec`. Gates
green: tsc clean, 125/125 tests, `check:loc` clean.

## What just landed

- `42c9ec9` — per-node `ports` override on `RNodeSpec`. `parseSpec`
  validates wires against the effective ports;
  `TopologyRoot.NodeView` threads `ports.inputs[i]` into
  relay/join/readgate bodies, matching `RSubstrateNode` on the
  editor path. New contract test `r-topology-readgate-port` covers
  a readgate slot named `"chainIn"` going through the full
  load → arrive → arm → consume cycle, plus a parseSpec rejection
  case for a wire that misses the overridden slot.

## Next moves (pick in order of friction)

1. **Multi-hop in the editor.** Drop a relay between input and
   readgate (or a join with two inputs) and step through. Confirm
   cohort 0 fires, then cohort 1, etc., and the readgate's ⌫ arms
   only after the final pulse arrives. Today's coverage is
   contract-only (`r-topology-chain`, `r-topology-join`); the live
   editor path through `RSubstrateNode` for multi-hop is unverified.
2. **Optional companion test:** mid-flight `pathD` change preserves
   pulse progress and completes at the new arc length (regression
   guard for `05f0f5d`).
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
