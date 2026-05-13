# Next task: verify the cycle self-sustains in the editor

**Branch:** `task/substrate-slot-in-node`. Tip `f7236cf`.
**Status:** mechanical work done; needs live-editor verification by
the user. 127/127 vitest green, tsc clean, LOC clean, build fresh.

## What just landed (committed)

Three commits resolve the friction surfaced this session — the
i1→readGate back-edge pulse parking visibly at the destination and
requiring repeated step-clicks to drain:

- `06a76fe` substrate: readgate emits `1` on its `out` port when all
  slots are filled and the out wire `canAccept`. Decided value
  (David): a fixed `1`. Dispatched on both editor (RSubstrateNode)
  and test (TopologyRoot) paths. New contract test
  [r-topology-readgate-emit.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-readgate-emit.test.tsx).
  Split `node-kinds.tsx` into siblings
  [node-kinds-chain-inhibitor.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-chain-inhibitor.tsx)
  and
  [node-kinds-readgate.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-readgate.tsx)
  to keep the LOC budget.
- `b552b0d` substrate: decouple wire substrate delivery from RAF
  animation in
  [Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx).
  Substrate delivery (`dest.fill`) is now gate-driven via a
  `pendingDeliver` flag; visual animation is RAF-driven via an
  `animDone` flag; phase transition `in-flight → empty` only fires
  when both clocks have closed. Removes the race that parked
  back-edge pulses at the destination.
- `f7236cf` driver: re-arm `requestAnimationFrame(advance)` in the
  fast path of
  [useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts)
  when not halted, so the cursor keeps walking through idle cohorts
  in resume mode (~60Hz). Earlier draft used `queueMicrotask` and
  hit OOM via a tight loop; rAF paces it correctly.

## Next move

**Verify in the editor that the cycle self-sustains.** Reload the
webview against `topology.json` (readGate1 ↔ i0 ↔ i1 closed loop,
`in08` feeding `chainIn`). Expected: in resume mode the cycle
pulses continuously while the input queue lasts; no manual step
clicks needed to drain the i1→readGate.chainIn2 back-edge. If it
still stalls or parks, capture the exact symptom in
[session-log.md](session-log.md) — the remaining suspects are:

- Cohort assignment ordering in
  [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
  if the editor's save path reorders wires.
- The decoupled wire's `tryFinalize()` predicate; if `animDone &&
  !pendingDeliver` never both go true on some path, phase stays
  in-flight forever.
- Driver `inFlightRef` getting stuck true under some interleaving.

## Suspect zones (carried)

- ChainInhibitor's manual `⇢` button is now mostly redundant when
  the cycle runs on its own; revisit whether to keep it as a debug
  aid or remove.
- ReadGate's manual `⌫` button stays useful for the no-out-wire
  case (existing contract test relies on it); leave alone.

## Housekeeping (carry forward)

- Fix `scripts/check-substrate-vocab.mjs` path
  (`substrate/` → `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.
- Run `npm run build` after any substrate-r edit (vitest/tsc alone
  don't refresh `out/webview.js`).

## ALWAYS clause

(See handoff.md — same clause applies.)
