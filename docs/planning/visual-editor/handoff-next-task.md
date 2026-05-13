# Next task: housekeeping, then offer merge to main

**Branch:** `task/substrate-slot-in-node`. Tip `f7236cf`.
**Status:** cycle live-verified by user (2026-05-13). 127/127
vitest green, tsc clean, LOC clean, build fresh.

## What just landed (committed)

Three commits resolve the i1→readGate back-edge parking friction
surfaced earlier this session:

- `06a76fe` substrate: readgate emits `1` on its `out` port when all
  slots are filled and the out wire `canAccept`. Dispatched on both
  editor (RSubstrateNode) and test (TopologyRoot) paths. Contract
  test
  [r-topology-readgate-emit.test.tsx](../../../tools/topology-vscode/test/contracts/r-topology-readgate-emit.test.tsx).
  Split `node-kinds.tsx` into siblings
  [node-kinds-chain-inhibitor.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-chain-inhibitor.tsx)
  and
  [node-kinds-readgate.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-readgate.tsx)
  for the LOC budget.
- `b552b0d` substrate: decouple wire substrate delivery from RAF
  animation in
  [Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx).
  Substrate delivery (`dest.fill`) is gate-driven via
  `pendingDeliver`; visual animation is RAF-driven via `animDone`;
  phase `in-flight → empty` requires both clocks closed.
- `f7236cf` driver: re-arm `requestAnimationFrame(advance)` in the
  fast path of
  [useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts)
  when not halted, so the cursor walks through idle cohorts in
  resume mode (~60Hz).

## Live verification (2026-05-13)

User reloaded the webview against `topology.json` (readGate1 ↔ i0
↔ i1 closed loop, `in08` feeding `chainIn`) and confirmed: in
resume mode the cycle pulses continuously while the input queue
lasts; no manual step clicks needed to drain the
i1→readGate.chainIn2 back-edge. The decoupled-clocks model holds
end-to-end.

## Next move

1. **Housekeeping.** Fix
   `scripts/check-substrate-vocab.mjs` path
   (`substrate/` → `substrate-r/`) so the vocab guard actually
   runs against the live tree. Then flag
   `task/in0-readgate-emission-ack` for user-approved deletion
   (auto-retire signal hit long ago).
2. **Manual `⇢` button on ChainInhibitor.** Now mostly redundant
   when the cycle self-sustains. Ask user whether to keep as a
   debug aid or remove. ReadGate's `⌫` stays — existing contract
   test relies on it for the no-out-wire case.
3. **Offer merge to `main`.** Branch is ready; needs explicit
   user sign-off per branch hygiene.

## ALWAYS clause

(See handoff.md — same clause applies.)
