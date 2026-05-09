# Manual-ack mechanism

How "B says room → A sends" is wired in the wires runtime. Read this
before touching `ClearSlotButton`, `runtime-wires*`, or
`_use-pulse-lanes-wire.ts`.

## The chain

**Registration (substrate)**

1. `startWiresRuntime(spec)` picks a shape: with ChainInhibitor →
   `setupInputReadGateInhibitor`, else → `setupInputReadGate`.
2. The shape returns `manualAckEdges: { id, label }[]`. Inhibitor
   shape returns two: chainIn (in0→readGate) and ack (i1→readGate).
3. Runtime stores them in `_manualAckEdges` (list, for the UI) and
   `_manualAckSet` (membership). `bumpVersion()` notifies subscribers.

**Send-side blocking (reused, not new)**

4. Each upstream node runs an `inputLoop`: body is
   `awaitGate → awaitReady → send`. When a wire's slot is full,
   `awaitReady()` blocks until `ackWire(wire)` is called. This is the
   only mechanism gating sends — no scheduler, no flag.

**Receive-side ack suppression**

5. The visual layer (`usePulseLanesWire.advanceLane0`) normally calls
   `ackWire(w)` on arc completion. It now skips that call when
   `isManualAckEdge(w.id)` is true. That's the entire suppression —
   one `if`-return.

**Manual ack (button)**

6. `ClearSlotButton` reads `getManualAckEdges()`, renders one
   `OneClearButton` per entry, plus a `ClearAllButton` when ≥2.
7. Each `OneClearButton` subscribes to its wire's `onArrive`/`onAck`
   to drive `disabled`. Click → `clearManualAckSlot(edgeId)` →
   `ackWire(w)` if `state === "inFlight"`.
8. `ackWire` resolves the `awaitReady()` the upstream loop is parked
   on; loop sends the next value.

**Lifecycle**

9. `stopWiresRuntime` clears `_manualAckEdges` + `_manualAckSet` and
   acks any in-flight wires so loops unblock and observe
   `stopped=true`.
10. `useSyncExternalStore(subscribeWires, getWiresVersion, …)`
    re-renders the panel on start/stop/version bump.

## What's safe

- **Editing topology while running** — runtime calls
  `stopWiresRuntime` (clears manual-ack state) before re-setup.
- **Switching shapes** — manual-ack list is replaced wholesale on
  every `startWiresRuntime`; `_manualAckSet.clear()` runs in both
  start and stop.
- **Edge id no longer exists** — `clearManualAckSlot` no-ops when
  `_wires.get(edgeId)` is missing; `OneClearButton` shows disabled.
- **Pause + click** — pause blocks `awaitGate`, not `awaitReady`. The
  click acks; loop wakes from `awaitReady` and parks at `awaitGate`
  until resume. The click "lands," but no pulse appears until unpaused.
- **Click when idle / multiple rapid clicks** — `disabled` + state
  recheck inside `clearManualAckSlot` make these no-ops.

## What's fragile

- **Adding a 3rd manual-ack edge** — works (the panel maps over the
  list), but the "⏏ both" title says "both readGate slots". Cosmetic
  fix: derive label from the edges' targets, or drop "readGate".
- **Manual-ack edges with different receivers** — same title-lie
  problem.
- **Auto-ack regression** — if anything new calls `ackWire` on a
  manual-ack wire (a future runtime hook, a different visual lane),
  it silently defeats the gating. The check is opt-out, not opt-in.
  Today the only auto-acker is `advanceLane0`. **Keep it that way,
  or audit on every new auto-acker.**
- **Wire swap mid-run** — `OneClearButton` re-subscribes on wire
  change; brief stale `occupied` until the effect re-runs. Runtime
  doesn't currently swap wires without a restart.
- **`[1]` placeholder queue on the inhibitor** — works under manual
  ack (the loop parks at `awaitReady` after one send). When
  ChainInhibitor gains a real inbound and switches to `andGateLoop`,
  manual-ack still applies because it's keyed on edge id, not loop
  type. The "i1 has a queue of 1s" mental model stops being literal.
- **Persistence** — manual-ack is runtime state, not spec state. If
  you want it as a per-edge spec property, that's a different design.

## Load-bearing assumption

The visual layer is the **only** auto-acker. As long as that holds,
the mechanism holds. Every new feature that might call `ackWire`
needs to be audited against the manual-ack set.

## Files

- [src/substrate/runtime-wires-shapes.ts](../tools/topology-vscode/src/substrate/runtime-wires-shapes.ts) — `ShapeSetup.manualAckEdges`, per-shape registration.
- [src/substrate/runtime-wires.ts](../tools/topology-vscode/src/substrate/runtime-wires.ts) — `getManualAckEdges`, `isManualAckEdge`, `clearManualAckSlot`, lifecycle.
- [src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts](../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts) — auto-ack skip.
- [src/webview/panels/ClearSlotButton.tsx](../tools/topology-vscode/src/webview/panels/ClearSlotButton.tsx) — buttons.
