// RTopologySpec: minimal spec shape for the new substrate. Independent
// of the editor's persistence format (which carries layout, comments,
// view-state, etc.). An adapter (later step) will project the editor's
// full spec into this shape.

export type RNodeKind = "input" | "readgate";

export interface RNodeSpec {
  id: string;
  kind: RNodeKind;
  // Kind-specific props. For input: `queue` is the array of values
  // to emit. For readgate: no props yet.
  props?: { queue?: unknown[] };
}

export interface RWireSpec {
  id: string;
  source: { nodeId: string; port: string };
  target: { nodeId: string; port: string };
  pathD: string;
  arcLength: number;
}

export interface RTopologySpec {
  nodes: RNodeSpec[];
  wires: RWireSpec[];
}
