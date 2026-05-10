// Step-function driver. tick() runs each node's step() once.
// Play = setInterval(tick, frameMs); pause = clearInterval. No
// scheduler, no microtask spinning, no concurrency primitives.

import type { StepNode } from "./node";

export function tick(nodes: readonly StepNode[]): void {
  for (const n of nodes) n.step();
}

export interface Driver {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  step(): void; // single tick (for tests)
}

export function makeDriver(nodes: readonly StepNode[], frameMs: number): Driver {
  let handle: ReturnType<typeof setInterval> | null = null;
  return {
    start() {
      if (handle !== null) return;
      handle = setInterval(() => tick(nodes), frameMs);
    },
    stop() {
      if (handle === null) return;
      clearInterval(handle);
      handle = null;
    },
    isRunning() { return handle !== null; },
    step() { tick(nodes); },
  };
}
