---
name: removed-node-visuals
description: Archive of node-level visuals removed from AnimatedNode during the wires-runtime port. Kept verbatim so they can be restored (and rewired to the wires runtime) later.
---

# Removed AnimatedNode visuals — restoration notes

Removed during revised step 2 of the rebuild (port-plan), in service
of "one animation thing at a time, driven by wires." Each entry below
is verbatim source from before removal so it can be reinstated when
the wires runtime publishes the appropriate signal.

Source-of-truth pre-removal commit: d649a59 (merge of `task/wires`
into `main`). `git show d649a59:tools/topology-vscode/src/webview/rf/AnimatedNode/AnimatedNode.tsx`
recovers the full file.

---

## 1. Flash (white inset overlay) — REMOVED

White rectangle inside the node, fades `0 → 0.5 → 0` over 300ms on
each `fire` event.

Trigger: `subscribe()` from legacy `sim/runner` event bus, filtered
to `ev.type === "fire" && ev.nodeId === id`.

**Ref + animation block (was inside the `subscribe` callback):**

```tsx
const flashRef = useRef<HTMLDivElement | null>(null);

const el = flashRef.current;
if (el) {
  // Cancel any in-progress flash so a rapid retrigger restarts at
  // full opacity instead of compositing a faded one.
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [{ opacity: 0 }, { opacity: 0.5, offset: 0.5 }, { opacity: 0 }],
    { duration: FLASH_DURATION_MS },
  );
}
```

**Overlay div (was rendered inside the node container, zIndex 0,
above the glow at zIndex -1):**

```tsx
<div
  ref={flashRef}
  style={{
    position: "absolute",
    inset: 0,
    background: "white",
    opacity: 0,
    borderRadius: radius,
    pointerEvents: "none",
    zIndex: 0,
  }}
/>
```

`FLASH_DURATION_MS = 300` lives in `_styles.ts` and is still used by
the glow visual (#2) at time of writing.

To restore on the wires runtime: subscribe to the per-node tick stream
(planned `subscribeNodeTicks`) and trigger this animation on each tick
for the matching `nodeId`.

---

## 2. Glow (outer box-shadow ring) — REMOVED

Outer halo around the node. On `fire` event, an animated `boxShadow`
in the node's stroke color expanded `0px → 4px → 2px → 0px` and faded
`0 → 0.8 → 0.4 → 0` over 300ms (FLASH_DURATION_MS, shared with the
flash). Reads as a brief radiating ring at the node edge.

Trigger: same `subscribe()` `fire` event on `sim/runner` as flash.

**Ref + animation block (was inside the `subscribe` callback):**

```tsx
const glowRef = useRef<HTMLDivElement | null>(null);

const gl = glowRef.current;
if (gl) {
  gl.getAnimations().forEach((a) => a.cancel());
  gl.animate(
    [
      { boxShadow: `0 0 0 0 ${data.stroke}00`, opacity: 0 },
      { boxShadow: `0 0 0 4px ${data.stroke}cc`, opacity: 0.8, offset: 0.4 },
      { boxShadow: `0 0 0 2px ${data.stroke}66`, opacity: 0.4, offset: 0.7 },
      { boxShadow: `0 0 0 0 ${data.stroke}00`, opacity: 0 },
    ],
    { duration: FLASH_DURATION_MS },
  );
}
```

**Overlay div (zIndex -1, behind the node body):**

```tsx
<div
  ref={glowRef}
  style={{
    position: "absolute",
    inset: 0,
    borderRadius: radius,
    pointerEvents: "none",
    opacity: 0,
    zIndex: -1,
  }}
/>
```

`FLASH_DURATION_MS = 300` was removed from `_styles.ts` together with
this commit (last consumer gone). Restore it there if you bring back
either flash or glow.

To restore on the wires runtime: same trigger as flash —
`subscribeNodeTicks` per-node tick stream.

---

## 3. Held tint (fill recolor by held value) — REMOVED

Node fill recolored by `world.state[id].held`: `+1` → `#ffab40`
(orange), `−1` → `#66bb6a` (green), anything else → the node's
default `data.fill`. Persistent — stayed tinted as long as the node
held that value. Tween from old to new fill via CSS
`transition: background-color ${tweenMs}ms linear` (tweenMs = current
tick interval).

Trigger: same `subscribe()` `fire` event on `sim/runner`; recomputed
from `world.state[id].held` on each fire.

**State + derived fill (was inside the component body):**

```tsx
import type { StateValue } from "../../../schema";

// Held-value tint driven from runner state (state.held) instead of a
// baked SMIL time loop: #ffab40 for +1, #66bb6a for −1, neutral
// otherwise.
const [held, setHeld] = useState<StateValue | undefined>(
  () => getWorld()?.state?.[id]?.held,
);

// inside the subscribe callback:
setHeld(s?.held);

// derived just before the return:
const heldNum = typeof held === "number" ? held : Number(held);
const heldFill = heldNum === 1 ? "#ffab40" : heldNum === -1 ? "#66bb6a" : null;
const fill = heldFill ?? data.fill;
```

**Container style change (was alongside the offset transition):**

```tsx
background: fill,
transition: `transform ${tweenMs}ms linear, background-color ${tweenMs}ms linear`,
```

After removal: `background: data.fill` and `transition: transform
${tweenMs}ms linear` (drops `background-color`).

To restore on the wires runtime: subscribe to a per-node held-value
stream (TBD — likely derived from each Wire's last-acked value at
the receiving end). Restore the `StateValue` import in
AnimatedNode.tsx.

---

## 4. Buffered halo (port-dot ring while waiting for peer) — REMOVED

Per-input-port indicator (NOT a node-body visual). When an input had
received a value but was still waiting for its peer (AND-style join),
that port's dot got a `boxShadow: 0 0 0 2px <port color>` ring. Steady
on while waiting, off once the join fired or no longer buffered.

Trigger: derived from `world.state[id].__has_<port>=1` via
`bufferedPorts()` from `sim/handlers`; refreshed on each `fire`
event from `sim/runner`'s `subscribe()`.

`bufferedPorts` itself is still exported and still used by
`fold-halo-probe.ts` and its tests — only AnimatedNode's consumption
was removed.

**State + subscribe wiring (was in AnimatedNode.tsx):**

```tsx
import { bufferedPorts } from "../../../sim/handlers";

// Audit row #4: per-port "input X waiting" indicator. State already
// exists as state.__has_<port>=1; bufferedPorts() reads it.
const [buffered, setBuffered] = useState<string[]>(
  () => bufferedPorts(getWorld()?.state?.[id]),
);

// inside the subscribe callback:
setBuffered(bufferedPorts(s));
```

**Input handle render (passed `buffered.includes(p.name)` as the 4th
`portStyle` arg + appended a tooltip suffix):**

```tsx
style={portStyle(
  "left",
  ((i + 1) * 100) / (data.inputs.length + 1),
  KIND_COLORS[p.kind] ?? "#888",
  buffered.includes(p.name),
)}
title={`${p.name} (${p.kind})${buffered.includes(p.name) ? " — buffered, waiting for peer" : ""}`}
```

**`portStyle` signature change in `_styles.ts` (4th `buffered` param
+ halo branch removed):**

```ts
export function portStyle(
  side: "left" | "right",
  topPct: number,
  color: string,
  buffered = false,
): React.CSSProperties {
  return {
    width: 8, height: 8, minWidth: 0, minHeight: 0,
    [side]: -4, top: `${topPct}%`,
    transform: "translate(0, -50%)",
    background: color, border: "1px solid #fff",
    borderRadius: 4,
    // Halo ring marks an input that has buffered a value and is waiting
    // for its peer (AND-style joins). Distinct from the fire/glow pulse —
    // halo is the idle "input X waiting" indicator (audit row #4).
    ...(buffered ? { boxShadow: `0 0 0 2px ${color}` } : {}),
  };
}
```

To restore on the wires runtime: derive buffered ports from inbound
Wires whose `state === "full"` and whose peers haven't acked. Restore
`bufferedPorts` import in AnimatedNode (or replace with a wire-derived
helper).
