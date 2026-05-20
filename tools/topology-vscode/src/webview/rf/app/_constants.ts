import type { EdgeKind } from "../../../schema";
import { FoldNode } from "../FoldNode";
import { NoteNode } from "../NoteNode";
import { RSubstrateEdge } from "../../substrate-r/RSubstrateEdge";
import { RSubstrateNode } from "../../substrate-r/RSubstrateNode";
import { InputNode } from "../nodes/InputNode";
import { RelayNode } from "../nodes/RelayNode";
import { JoinNode } from "../nodes/JoinNode";
import { ReadGateNode } from "../nodes/ReadGateNode";
import { ReadLatchNode } from "../nodes/ReadLatchNode";
import { SubstrateEdge } from "../edges/SubstrateEdge";

export const EDGE_TYPES = { animated: RSubstrateEdge, substrate: SubstrateEdge };
export const RF_NODE_TYPES = { animated: RSubstrateNode, fold: FoldNode, note: NoteNode, input: InputNode, relay: RelayNode, join: JoinNode, readGate: ReadGateNode, readLatch: ReadLatchNode };

// Alignment-guide tolerance is in flow units; 4 covers off-grid drag
// noise without firing on every near-miss.
export const ALIGN_TOL = 4;

export const FLASH_TIMEOUT_MS = 1500;

export const FIT_VIEW_DURATION_MS = 250;
export const FIT_VIEW_PADDING = 0.2;
export const FIT_VIEW_PADDING_WIDE = 0.4;
export const FIT_VIEW_MAX_ZOOM = 1.2;

export const EDGE_KIND_OPTIONS: EdgeKind[] = [
  "chain", "signal", "release", "streak",
  "pointer", "and-out", "edge-connection", "inhibit-in", "any",
];
