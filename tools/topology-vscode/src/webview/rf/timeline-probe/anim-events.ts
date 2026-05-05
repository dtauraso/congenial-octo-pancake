// Animation event subscription. Consumers (e.g. FoldNode halo) bind
// view state to the animation lifecycle here instead of subscribing
// to raw simulator events — the simulator fires receives at sim-
// instant times while the view's "received" moment is when the pulse
// visually arrives. Closes the model/view temporal-decoupling bug
// class.

import type { AnimEvent, AnimListener } from "./types";

const animListeners: AnimListener[] = [];

export function subscribeAnim(fn: AnimListener): () => void {
  animListeners.push(fn);
  return () => {
    const i = animListeners.indexOf(fn);
    if (i >= 0) animListeners.splice(i, 1);
  };
}

export function dispatchAnim(e: AnimEvent): void {
  for (let i = 0; i < animListeners.length; i++) {
    try {
      animListeners[i](e);
    } catch {
      // isolate
    }
  }
}
