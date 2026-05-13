# Next task: lock ChainInhibitor → ReadGate in a contract test

**Branch:** `task/substrate-slot-in-node`. Tip: `2cec842`
("substrate: ChainInhibitor primitive with manual single-pulse
emit").
**Status:** `chaininhibitor` is a substrate-r kind on both paths
with a manual `⇢` emit button (1 pulse per click, gated by
`wire.canAccept`). Live rig: `in08` (Input) → `readGate1.chainIn`
and `i1` (ChainInhibitor, no upstream) → `readGate1.chainIn2`.
The 2-slot AND on `readGate1` arms only after `in08` pulses AND
the user clicks `⇢` on `i1`.

## What just landed

- Substrate-r kind `chaininhibitor` registered in
  [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts)
  with `{ inputs: ["in"], outputs: ["out"] }`.
- `ChainInhibitorBody` in
  [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx):
  slot-in-node pass-through plus a `⇢` button that loads value `1`
  onto the out wire on click. `data-armed` / `data-emit-id`
  attributes for test selectors. State `canEmit` reflects
  `wire.canAccept` between ticks.
- Dispatch added on both paths
  ([TopologyRoot](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx),
  [RSubstrateNode](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateNode.tsx)).
- `i1` flipped from `Input` to `ChainInhibitor` in
  [topology.json](../../../topology.json); side:"left" output kept
  so the existing snake edge to `readGate1.chainIn2` is unchanged.

## Next moves (pick in order of friction)

1. **Contract test for the manual emit path.** Mirror the existing
   readgate contract tests under
   `test/contracts/r-topology-*.test.tsx`: drive `⇢` on
   `chaininhibitor`, assert the out wire loads, then assert the
   downstream readgate slot fills. Capture parking topology
   (button armed but click is a no-op because slot already filled)
   as a failing test first.
2. **Self-driven inhibitor.** Add a third `Input` upstream of `i1`
   so the chain pass-through fires automatically and the manual
   `⇢` button becomes a debug affordance rather than the only
   source. Decide if `⇢` stays after that.
3. **Editor path coverage.** A 2-input AND test through the React
   Flow path (not just `TopologyRoot`) is still on the prior task
   list and not landed.

## Suspect zones

- `canEmit` is set inside `run` on every tick; if the driver stops
  ticking the inhibitor, the button can stay stale. Verify the
  registry keeps `i1` in `nodeRefs` so `onRun` fires.
- Schema default for `ChainInhibitor` declares 4 outputs
  (`inhibitOut`, `readNew`, `out`, `ack`). The rig overrides to a
  single `out`; `firstOutputPort` logic in `RSubstrateNode` would
  otherwise pick `inhibitOut`. Any new inhibitor instance without
  an outputs override will silently mis-route.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` →
  `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.
- Run `npm run build` after substrate-r / RSubstrateNode edits —
  vitest/tsc alone do not refresh `out/webview.js`.

## ALWAYS clause

(See handoff.md — same clause applies.)
