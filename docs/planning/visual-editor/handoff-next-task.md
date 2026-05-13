# Next task: confirm per-hop propagation; then housekeeping

**Branch:** `task/substrate-slot-in-node`. Tip `44406cd`.
**Status:** 126/126 vitest green, tsc clean, LOC clean, build fresh.
Needs live re-verification — the substrate model just changed.

## What just landed (committed)

`44406cd` substrate: deliver on RAF arrival; remove cohort gate from
delivery path
([Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)).

The session surfaced two coupled defects:

1. **Cohort gate sat on the delivery path.** `Wire.load` waited on
   `gate.subscribe(cohort, …)` before delivering. That meant the
   cursor (an observation axis) was holding back substrate firing.
   User clarification: "the cohort is a different thing that happens
   to be running at the same time" — observation-only.
2. **One load cascaded synchronously through the whole topology.**
   With delivery moved to `load`, a single click on a debug emit
   button injected a stimulus into every downstream node in one
   event-loop turn. User clarification: a button on i1 should send
   one pulse on i1's edge, not start the entire animation.

Fix: `load` only stages; `tryFinalize` (called on RAF endpoint) is
what calls `deliverIfPending()`. Each hop now costs one wire
arrival. The cohort gate is no longer wired into delivery — it
remains as a label the cursor reads for painting/scrub.

Contract tests
[r-topology-chain.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-chain.test.tsx)
and
[r-topology-join.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-join.test.tsx)
updated to assert per-hop propagation (step + multiple flushRaf,
not one synchronous step).

## Next move

1. **Live re-verify the cycle.** Reload the webview against
   `topology.json` and confirm that in resume mode the readGate1 ↔
   i0 ↔ i1 cycle still pulses continuously, now with each hop
   visibly animating along one wire at a time. Press i1's `⇢` and
   confirm it produces one pulse on i1→readGate (not an instant
   topology-wide cascade).
2. **Retire ChainInhibitor's `⇢` debug button.** User's call:
   ChainInhibitor is not a source. Its only legitimate emit is
   "consume my slot and forward that value." The `⇢` button bypasses
   the slot and loads a literal `1`, giving a non-source node source
   powers. Remove from
   [node-kinds-chain-inhibitor.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-chain-inhibitor.tsx).
3. **Housekeeping carries.** Fix
   `scripts/check-substrate-vocab.mjs` path
   (`substrate/` → `substrate-r/`). Flag
   `task/in0-readgate-emission-ack` for user-approved deletion.
4. **Offer merge to `main`** after (1)–(3) are clean.

## ALWAYS clause

(See handoff.md — same clause applies.)
