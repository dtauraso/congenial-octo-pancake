---
name: substrate node loops must be paced by the visual layer
description: Substrate node loops must not synchronously consume their own input — the visual layer (rAF/PulseInstance) is the cycle pacer. Internal acks starve the renderer.
type: feedback
---

A substrate node loop that fires onTick and then synchronously acks its inbound wires forms a microtask-only cycle with the upstream inputLoop(s). It starves the macrotask queue, so:

- In tests, `setTimeout`-based polling never fires (loops appear to hang).
- In the browser, ReactFlow can't lay out — `rAF`/measurement starves, edges and the canvas stay blank.

**Why:** discovered building the first multi-input ChainInhibitor port (2026-05-08). `joinLoop` originally acked both inbound wires after `onFire`. With two inputLoops feeding it, the cycle ran entirely in microtasks; ReactFlow had no frame to render. A first-pass rAF yield masked the symptom but produced a "train of pulses" because the loop still advanced faster than visual traversal.

**How to apply:**
- New node-loop primitives must defer the ack to the visual layer. Pattern: `await Promise.all(inbound.map((w) => w.awaitReady()))` after `onFire` — this blocks until the renderer's `PulseInstance.onDone` calls `ackWire` for each inbound. The cycle is then paced by the slowest visual pulse, which is the right semantics.
- Tests for these loops must drive acks themselves to simulate visual completion (poll wire state, `ackWire` when both inFlight); they cannot rely on the substrate alone.
- Symptom-to-cause shortcut: if the canvas is empty but `inner-render`/`an-render`/`an-effect` slogs all fire and **`useEffect` setTimeouts never trigger**, suspect a microtask hot loop in the substrate before suspecting React/RF.
