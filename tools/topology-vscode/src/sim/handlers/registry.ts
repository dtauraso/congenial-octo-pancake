// HANDLERS[type][inputPort] = handler. Types with no inputs (Input,
// Generic) have no entries — they're driven by seed events instead.
//
// MOTION_TYPES: handlers that write state.dx / state.dy. Phase 6 Chunk B
// uses this to route paused-drag onto props (slidePx/slideDy) rather
// than base x/y. Keep in sync with handlers that write dx/dy.
//
// GATE_TYPES: handlers that buffer-and-wait (joins / latches). Used by
// the concurrency classifier — these mark serialization barriers, and
// any node downstream is treated as gated. Adding a new join handler
// without listing it here will cause its downstream edges to be
// misclassified as concurrent.

import type { HandlerFn } from "../../schema";
import { chainInhibitorIn } from "./chain-inhibitor";
import {
  andGateJoin,
  edgeJoin,
  inhibitRightJoin,
  readGateJoin,
  syncGateJoin,
} from "./joins";
import { latchHandlers } from "./latches";
import { partitionIn } from "./partition";
import { sbdJoin, sdJoin } from "./streak-detectors";

export const HANDLERS: Record<string, Record<string, HandlerFn>> = {
  ChainInhibitor: { in: chainInhibitorIn },
  InhibitRightGate: { left: inhibitRightJoin, right: inhibitRightJoin },
  ReadLatch: latchHandlers,
  DetectorLatch: latchHandlers,
  ReadGate: { chainIn: readGateJoin, ack: readGateJoin },
  SyncGate: { a: syncGateJoin, b: syncGateJoin },
  AndGate: { a: andGateJoin, b: andGateJoin },
  PatternAnd: { a: andGateJoin, b: andGateJoin },
  StreakBreakDetector: { old: sbdJoin, new: sbdJoin },
  StreakDetector: { old: sdJoin, new: sdJoin },
  Partition: { in: partitionIn },
  EdgeNode: { left: edgeJoin, right: edgeJoin },
};

export const MOTION_TYPES: ReadonlySet<string> = new Set(["Partition"]);

export const GATE_TYPES: ReadonlySet<string> = new Set([
  "AndGate",
  "SyncGate",
  "ReadGate",
  "InhibitRightGate",
  "PatternAnd",
  "ReadLatch",
  "DetectorLatch",
  "StreakBreakDetector",
  "StreakDetector",
  "EdgeNode",
]);

export function getHandler(
  nodeType: string,
  inputPort: string,
): HandlerFn | undefined {
  return HANDLERS[nodeType]?.[inputPort];
}
