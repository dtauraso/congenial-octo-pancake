# Next task: cut the editor over to the new React-resident substrate

**Branch:** `task/collapse-to-one-layer`. Continue on this branch.

## Context

The substrate has been re-conceived as React components in the
webview, eliminating the host-shim tick driver, the frame protocol,
the frame-store, and the postMessage handlers for play/pause/step/
clear-slot/pulse-arrived. Two specs are landed on main pinning the
model and the React surface. Primitives are landed on this branch
with 237/237 tests passing — but no consumers in the live editor
yet. The cutover is the load-bearing remaining work.

## What's done

Read [handoff.md](handoff.md) for the full state. Six commits on
this branch:

- `d550bab` substrate/log.ts blocker fix (substrate bundles in webview)
- `03f1100` React-surface spec
- `94a5674` `<Wire>` + phase reducer + 11 tests
- `dc7a07c` `<Node>` + manual-take button + subscribePhase + 7 tests
- `ccbb50c` `useTickDriver` + 7 tests
- `b66ddf4` TopologyRoot harness + 3 end-to-end tests
- `2dc3f8e` spec-driven TopologyRoot + Input/ReadGate kinds

## What's left — the cutover

Plain ordering, no options. Each item is a separate commit unless
trivially small. **Each commit must leave the editor working.**

1. **RTopologySpec adapter.** Convert the editor's persisted spec
   (with positions, edges, viewer state) into RTopologySpec. Lives
   alongside the existing spec-to-flow adapter. Maps Input nodes to
   `{kind: "input"}` and ReadGate to `{kind: "readgate"}`; derives
   `pathD` / `arcLength` from the edge geometry React Flow produces.
   Other node types: drop them in this pass (today's working
   topology uses only Input + ReadGate). Test: adapter on a fixture.

2. **Global wire/node registry context.** A React context that holds
   `Map<wireId, RefObject<WireHandle | null>>` and
   `Map<nodeId, RefObject<NodeHandle | null>>`. Components register
   on mount via context. `useTickDriver` reads from the context.
   Replaces the per-render ref maps in current TopologyRoot.

3. **AnimatedEdge replacement.** New `RSubstrateEdge` registered with
   React Flow's `edgeTypes`. Reads sourceX/Y/targetX/Y from React
   Flow props, computes pathD + arcLength, mounts a `<Wire>` whose
   ref registers in the context.

4. **AnimatedNode wrapping.** Wrap each React Flow node component so
   that for Input and ReadGate it also mounts the matching
   `<Node>`-kind body (Input/ReadGateBody from node-kinds.tsx) with
   refs registered in the context.

5. **TopologyRoot at the app level.** Wrap `<AppView>` in a provider
   that owns the registry context and runs `useTickDriver` against
   it. The driver replaces host-shim's run-frames.

6. **TransportControls cutover.** Remove the postMessage path
   (`frame-pause` / `frame-resume` / `frame-step`); call
   `driver.halt/resume/step` from the context.

7. **Manual-take cutover.** Remove the postMessage `clear-slot`
   path; the `<Node>` button already wires direct take().

8. **Spec ingestion.** Extension sends spec on `ready`; webview's
   adapter (step 1) projects into RTopologySpec.

9. **Delete dead code.** Frame protocol, frame-store as
   deserialization, host-shim run-frames frame emission, postMessage
   handlers for play/pause/step/clear-slot/pulse-arrived, the
   ReadGate auto-loop carveout, the `cleared`→`acked` collapse, old
   `substrate/wire.ts` and friends (audit which substrate files are
   now unused), the old `ClearSlotButton.tsx`.

10. **Tests.** Migrate or delete: clear-slot-button-armed,
    run-frames, run-frames-controls, recorder, serialize-frame,
    host-shim, renderer-adapter, dom-substrate-smoke (some survive,
    some get rewritten against the new shapes).

11. **Promote specs into MODEL.md.** Once the rewrite is live, fold
    manual-take-model.md and react-surface-spec.md into MODEL.md and
    delete the planning files.

12. **Update CLAUDE.md posture.** This was a structural rewrite under
    overridden substrate rule. After cutover, posture returns to
    friction-driven. Note this in CLAUDE.md if appropriate.

## Risk

The load-bearing step is 3+4+5 in one commit (they're coupled). If
they ship together with the registry context working, the editor
runs on the new substrate. If any of them is wrong, the editor
breaks. Worth landing 1+2 as separate prep commits, then a careful
single commit for 3+4+5.

## ALWAYS clause

(See handoff.md — same clause applies.)
