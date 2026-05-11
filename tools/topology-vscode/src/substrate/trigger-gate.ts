// Toggle gate for parking a loop until the user clicks "open". Default
// state is closed: awaitOpen() resolves immediately when open, otherwise
// suspends until toggle() flips to open. Used to anchor a node's send
// loop to a panel button (Shape C: i1's input loop).

export interface TriggerGate {
  isOpen(): boolean;
  toggle(): void;
  awaitOpen(): Promise<void>;
  // Resolve any pending awaitOpen() waiters without changing open state.
  // Used on runtime stop so parked loops can observe stopped=true.
  wake(): void;
  subscribe(fn: () => void): () => void;
}

export function makeTriggerGate(initialOpen = false): TriggerGate {
  let open = initialOpen;
  let waiters: Array<() => void> = [];
  const listeners = new Set<() => void>();
  return {
    isOpen: () => open,
    toggle() {
      open = !open;
      if (open) {
        const w = waiters; waiters = [];
        for (const r of w) r();
      }
      for (const fn of listeners) fn();
    },
    awaitOpen() {
      if (open) return Promise.resolve();
      return new Promise<void>((resolve) => { waiters.push(resolve); });
    },
    wake() {
      const w = waiters; waiters = [];
      for (const r of w) r();
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
