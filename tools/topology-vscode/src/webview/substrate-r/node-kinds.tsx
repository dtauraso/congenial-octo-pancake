// Node-kind implementations under the slot-in-node substrate.
//
// Input: each run() checks `outWire.canAccept` (wire empty AND dest
// slot empty) and loads the next queue value if so. No subscription,
// no ack — the wire returns to empty on arrival under its own
// machinery.
//
// ChainInhibitorBody / ReadGateBody live in sibling files to keep
// each file under the LOC budget.

import { useCallback, useRef, type RefObject, type ReactNode } from "react";
import { Node, type NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import type { RNodeKind } from "./spec";
import { ChainInhibitorBody } from "./node-kinds-chain-inhibitor";
import { ReadGateBody } from "./node-kinds-readgate";

export { ChainInhibitorBody, ReadGateBody };

export interface KindBodyCtx {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotIds: string[];
  initialQueue: unknown[];
}

// Single dispatch from validated kind to body component. Both
// TopologyRoot (test path) and RSubstrateNode (editor path) call this
// — there is no second switch to keep in sync.
export function renderKindBody(kind: RNodeKind, ctx: KindBodyCtx): ReactNode {
  const { nodeRef, outWireRef, slotIds, initialQueue } = ctx;
  switch (kind) {
    case "input":
      return <InputBody nodeRef={nodeRef} outWireRef={outWireRef} initialQueue={initialQueue} />;
    case "relay":
      return <RelayBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={slotIds[0]} />;
    case "chaininhibitor":
      return <ChainInhibitorBody nodeRef={nodeRef} outWireRef={outWireRef} slotId={slotIds[0]} />;
    case "join":
      return <JoinBody nodeRef={nodeRef} outWireRef={outWireRef} slotAId={slotIds[0]} slotBId={slotIds[1]} />;
    case "readgate":
      return <ReadGateBody nodeRef={nodeRef} slotIds={slotIds} outWireRef={outWireRef} />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function InputBody({
  nodeRef, outWireRef, initialQueue,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  initialQueue: unknown[];
}) {
  const remainingRef = useRef([...initialQueue]);

  const run = useCallback(() => {
    const handle = outWireRef.current;
    if (!handle) return;
    if (!handle.canAccept) return;
    if (remainingRef.current.length === 0) return;
    handle.load(remainingRef.current.shift());
  }, [outWireRef]);

  return <Node ref={nodeRef} onRun={run} />;
}

export function RelayBody({
  nodeRef, outWireRef, slotId = "in0",
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotId?: string;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotId) !== "filled") return;
    if (!wire.canAccept) return;
    const value = node.consume(slotId);
    wire.load(value);
  }, [nodeRef, outWireRef, slotId]);

  return <Node ref={nodeRef} slots={[slotId]} onRun={run} />;
}

export function JoinBody({
  nodeRef, outWireRef, slotAId = "a", slotBId = "b",
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotAId?: string;
  slotBId?: string;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase(slotAId) !== "filled") return;
    if (node.slotPhase(slotBId) !== "filled") return;
    if (!wire.canAccept) return;
    const va = node.consume(slotAId);
    const vb = node.consume(slotBId);
    wire.load([va, vb]);
  }, [nodeRef, outWireRef, slotAId, slotBId]);

  return <Node ref={nodeRef} slots={[slotAId, slotBId]} onRun={run} />;
}
