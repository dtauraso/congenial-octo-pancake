// Webview painter store. Receives FrameMsg from the host and exposes a
// useSyncExternalStore-friendly snapshot. `isFrameMode()` flips true
// once the first frame arrives.
//
// Lives outside src/substrate/ — it's a webview-side bridge, not a
// substrate concern. Maps reconstructed from the [id, state] pair
// arrays so consumers don't re-parse on every render.

import type { FrameMsg, NodeFrameMsgState, WireFrameMsgState } from "../messages";

interface Snapshot {
  readonly seq: number;
  readonly wires: ReadonlyMap<string, WireFrameMsgState>;
  readonly nodes: ReadonlyMap<string, NodeFrameMsgState>;
  readonly active: boolean;
}

const EMPTY: Snapshot = {
  seq: -1,
  wires: new Map(),
  nodes: new Map(),
  active: false,
};

let current: Snapshot = EMPTY;
const listeners = new Set<() => void>();

export function setFrame(msg: FrameMsg): void {
  current = {
    seq: msg.seq,
    wires: new Map(msg.wires),
    nodes: new Map(msg.nodes),
    active: true,
  };
  for (const l of listeners) l();
}

export function subscribeFrame(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function getFrameSnapshot(): Snapshot {
  return current;
}

export function isFrameMode(): boolean {
  return current.active;
}

export function getWireState(id: string): WireFrameMsgState | undefined {
  return current.wires.get(id);
}

export function getNodeState(id: string): NodeFrameMsgState | undefined {
  return current.nodes.get(id);
}
