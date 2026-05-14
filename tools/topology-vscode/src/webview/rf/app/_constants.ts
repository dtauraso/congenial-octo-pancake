import type { EdgeKind } from "../../../schema";
import { FoldNode } from "../FoldNode";
import { NoteNode } from "../NoteNode";
import { RSubstrateEdge } from "../../substrate-r/RSubstrateEdge";
import { RSubstrateNode } from "../../substrate-r/RSubstrateNode";

export const EDGE_TYPES = { animated: RSubstrateEdge };
export const RF_NODE_TYPES = { animated: RSubstrateNode, fold: FoldNode, note: NoteNode };

// Alignment-guide tolerance is in flow units; 4 covers off-grid drag
// noise without firing on every near-miss.
export const ALIGN_TOL = 4;

export const EDGE_KIND_OPTIONS: EdgeKind[] = [
  "chain", "signal", "release", "streak",
  "pointer", "and-out", "edge-connection", "inhibit-in", "any",
];
