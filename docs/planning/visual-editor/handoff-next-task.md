# Next task: verify source → wire → destination pulse in the editor

**Branch:** `task/substrate-slot-in-node`.
**Status:** Editor path now dispatches all four kinds
(input/relay/join/readgate) and threads cohort + gate from the
registry into `<Wire>`. Tip `fd7ad63`. Gates green: tsc clean,
123/123 tests, `check:loc` clean.

## The verification target

A pulse loaded at a source node travels its outgoing wire and
arrives at the destination's slot — driven from the editor, not
just from a contract test. Same correctness target as the prior
handoff, but now actually reachable.

## What to do

1. Open the editor. Load a topology with at least an input node
   and a readgate (and ideally a relay or join in between).
2. Click `step` on the transport. The driver releases the current
   cohort; cohort-0 wires animate, complete, fill their dest slot.
   For multi-hop topologies, step again for each cohort.
3. Confirm at each hop: pulse animates, arrives, destination's
   slot phase becomes `filled`, downstream node's `onRun` fires,
   next wire loads. Readgate's manual-take button arms when its
   slot is `filled`.
4. If any case parks (pulse stops at a wire and stays, or a slot
   never fills), capture the failing topology + step sequence as
   a contract test under `test/contracts/r-topology-*.test.tsx`
   **before** fixing. The contract test is what locks in the
   regression.

## What "working" means here

After N `step`s (N = number of cohorts in the topology), every
destination slot reachable from a primed input carries the value
that was loaded. No fossil pulses left over from prior edits, no
stuck `consumed` state, no relay/join silently dead-ending.

## Suspect zones if it parks

- Cohort math: `assignCohortsForEdges` is parseSpec-free, so kind
  drift can't break it, but it does assume a DAG. A cycle hits
  the `visiting` guard and returns 0, which may not be what you
  want.
- Driver advance: `useTickDriver.advance` watches the current
  cohort's wires for `empty`; if a wire never returns to empty
  (e.g. destination slot stays `filled` because no body consumes
  it), the cursor never advances.
- A new kind whose `*Body` was added to `node-kinds.tsx` and
  `TopologyRoot` but not to `RSubstrateNode` — exactly the drift
  CLAUDE.md's new landing rule prohibits.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` →
  `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved
  deletion.
- Pre-existing `topology.view.json` working-tree diff still
  untouched.

## ALWAYS clause

(See handoff.md — same clause applies.)
