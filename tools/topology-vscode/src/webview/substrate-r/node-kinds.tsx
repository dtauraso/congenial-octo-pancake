// Node-kind implementations under the slot-in-node substrate.
//
// Input: each run() checks `outWire.canAccept` (wire empty AND dest
// slot empty) and loads the next queue value if so. No subscription,
// no ack — the wire returns to empty on arrival under its own
// machinery.
//
// ReadGate: declares slot "in0". Manual-gate destination — onRun is a
// no-op; the slot fills when the wire arrives, and the button consumes
// the slot on click. No downstream emission in this commit.

import { useCallback, useRef, type RefObject } from "react";
import { Node, type NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import { ManualTakeButton } from "./ManualTakeButton";

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

export function ReadGateBody({
  nodeRef, slotId = "in0",
}: {
  nodeRef: RefObject<NodeHandle | null>;
  slotId?: string;
}) {
  return (
    <>
      <Node ref={nodeRef} slots={[slotId]} />
      <ManualTakeButton
        nodeRef={nodeRef}
        slotId={slotId}
        onConsume={() => nodeRef.current?.requestConsume(slotId)}
      />
    </>
  );
}
