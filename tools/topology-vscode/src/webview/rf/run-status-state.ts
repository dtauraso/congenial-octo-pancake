// Imperative bridge for runStatus — mirrors rf-imperative.ts pattern.
// main.tsx calls setRunStatusImperative from the window message handler;
// App registers the React setState via registerRunStatusSetter on mount.

import type { RunStatusUI } from "../state/store";

type Setter = (next: RunStatusUI) => void;

let _setter: Setter | null = null;
let _current: RunStatusUI = { state: "idle" };

export function registerRunStatusSetter(setter: Setter) {
  _setter = setter;
}

export function setRunStatusImperative(next: RunStatusUI) {
  _current = next;
  _setter?.(next);
}

export function getRunStatus(): RunStatusUI {
  return _current;
}
