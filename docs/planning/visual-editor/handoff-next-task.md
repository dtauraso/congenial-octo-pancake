# Next task: live AND-gate test + multi-hop with a real Relay

**Branch:** `task/substrate-slot-in-node`. Tip: the variable-arity
readgate landing (see commit below).
**Status:** ReadGate is now an N-slot AND on both substrate paths,
per-instance port overrides flow editor → React Flow, and per-port
`side` lets an output render on the left. Live editor has a 2-input
AND rig wired up; the take button arms only after both slots fill.

## What just landed

- Substrate-r: `readgate` is variable-arity in
  [spec.ts](../../../tools/topology-vscode/src/webview/substrate-r/spec.ts);
  `ReadGateBody`
  ([node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx))
  subscribes to every slot, arms one ⌫ button when **all** are
  `filled`, and consumes all on click. Both dispatch paths
  (`TopologyRoot`, `RSubstrateNode`) thread the full inputs array.
- Editor schema: `Node` gains `inputs?: Port[]` / `outputs?: Port[]`
  per-instance overrides
  ([types-graph.ts](../../../tools/topology-vscode/src/schema/types-graph.ts)),
  parsed in
  [parse-nodes-edges.ts](../../../tools/topology-vscode/src/schema/parse-nodes-edges.ts),
  honored by `validatePorts`
  ([parse-meta.ts](../../../tools/topology-vscode/src/schema/parse-meta.ts))
  and `spec-to-flow`
  ([spec-to-flow.ts](../../../tools/topology-vscode/src/webview/rf/adapter/spec-to-flow.ts)).
- `Port` gains optional `side?: "left" | "right"`
  ([types.ts](../../../tools/topology-vscode/src/schema/types.ts));
  `RSubstrateNode` groups handles by effective side so an output can
  render on the left.
- `Relay` is now a registered editor kind in
  [node-types.ts](../../../tools/topology-vscode/src/schema/node-types.ts)
  (one `in0` input, one `out` output, chain kind).
- Live rig: [topology.json](../../../topology.json) has `in08` and
  `i1` (both Input) feeding `readGate1.chainIn` / `chainIn2`. `i1`
  declares `outputs: [{ side: "left" }]` to demonstrate the override.

## Next moves (pick in order of friction)

1. **Lock the AND in a contract test.** Two-input readgate via the
   editor's React Flow path (not just `TopologyRoot`). Mirrors
   `r-topology-readgate-port` but with N=2 and arms only after both
   pulses arrive. Capture any parking topology as a failing test first.
2. **Real multi-hop with Relay.** Swap `i1` back to `type: "Relay"`
   and feed it from a third Input, so one of the gate's slots
   actually traverses a hop. Today both inputs go straight to the
   gate; the relay path is still unverified end-to-end in the editor.
3. **Optional:** mid-flight `pathD` change preserves pulse progress
   (regression guard for `05f0f5d`).

## Suspect zones

- `RSubstrateNode` handle grouping by `side` is new; verify it does
  not regress single-side renders for other kinds.
- `validatePorts` now reads effective ports (`n.inputs ?? def.inputs`);
  any code path that still reads `NODE_TYPES[type].inputs` directly
  will diverge — `ghost.ts` and `_on-connect.ts` are the known
  remaining sites, untouched this round.

## Housekeeping (carry forward)

- Fix `check-substrate-vocab.mjs` path (`substrate/` →
  `substrate-r/`).
- Flag `task/in0-readgate-emission-ack` for user-approved deletion.
- Run `npm run build` after substrate-r / RSubstrateNode edits —
  vitest/tsc alone do not refresh `out/webview.js`.

## ALWAYS clause

(See handoff.md — same clause applies.)
