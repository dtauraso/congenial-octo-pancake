# Node bodies use RAF polling, not event-driven wakeup

Under the current substrate-r model, node bodies self-wake via their own RAF loop (`requestAnimationFrame` in each kind body). Slot fills do NOT trigger run — bodies poll independently.

**Consequence:** outbound wire state is NOT a wake source. Bodies check `wire.canAccept` as a guard before calling `wire.load(value)`. `wire.load` is a silent no-op when the wire is in-flight, so the guard prevents unnecessary calls but a missing guard is not a correctness hazard — it is a performance one.

**Current code pattern** (all node kinds):
```tsx
useEffect(() => {
  let raf = 0;
  const step = () => { run(); raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}, [run]);
```

**Do NOT add**: subscriptions to outWire phase changes as a wakeup mechanism. If a body needs to coordinate on output drain, that requires a different substrate signal. Check NODE.md for the current model before proposing output-drain coupling.

*Updated 2026-05-17: removed stale reference to `Node.fill()` (API deleted); clarified `wire.load` silent-no-op behavior.*
