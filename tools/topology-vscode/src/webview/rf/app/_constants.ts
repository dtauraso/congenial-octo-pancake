import type { EdgeKind } from "../../../schema";
import { AnimatedEdge } from "../AnimatedEdge";
import { AnimatedNode } from "../AnimatedNode";
import { FoldNode } from "../FoldNode";
import { NoteNode } from "../NoteNode";

export const EDGE_TYPES = { animated: AnimatedEdge };
export const RF_NODE_TYPES = { animated: AnimatedNode, fold: FoldNode, note: NoteNode };

// Alignment-guide tolerance is in flow units; 4 covers off-grid drag
// noise without firing on every near-miss.
export const ALIGN_TOL = 4;

export const EDGE_KIND_OPTIONS: EdgeKind[] = [
  "chain", "signal", "feedback-ack", "release", "streak",
  "pointer", "and-out", "edge-connection", "inhibit-in", "any",
];
