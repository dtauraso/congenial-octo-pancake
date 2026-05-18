# Node bodies use RAF polling, not event-driven wakeup

Under the current polling substrate-r model, node bodies self-wake via their own RAF loop (useEffect in each kind body). `Node.fill()` does NOT trigger `run()` — bodies poll independently.

**Consequence:** outbound wire state (including `canAccept`) is NOT a wake source. Bodies must check `wire.canAccept` as a guard in their `run()` callback to prevent silent loss when a wire is in-flight, but they do not subscribe to wire phase changes.

**Current code pattern** (all node kinds):
```tsx
useEffect(() => {
  let raf = 0;
  const step = () => { run(); raf = requestAnimationFrame(step); };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}, [run]);
```

**Do NOT add**: subscriptions to outWire phase changes as a wakeup mechanism. If a body needs to coordinate on output drain (e.g., blocking pending upstream input), that requires a different substrate signal (e.g., back-pressure clause, ready-event, or barrier). Check NODE.md for the current model before proposing output-drain coupling.
