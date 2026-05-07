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

## 3. Held tint (fill recolor by held value) — NOT YET REMOVED

(placeholder — will be filled in when removed)

---

## 4. Buffered halo (port-dot ring while waiting for peer) — NOT YET REMOVED

(placeholder — will be filled in when removed)
