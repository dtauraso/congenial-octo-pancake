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
  nodeRef, outWireRef,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase("in0") !== "filled") return;
    if (!wire.canAccept) return;
    const value = node.consume("in0");
    wire.load(value);
  }, [nodeRef, outWireRef]);

  return <Node ref={nodeRef} slots={["in0"]} onRun={run} />;
}

export function JoinBody({
  nodeRef, outWireRef,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    if (node.slotPhase("a") !== "filled") return;
    if (node.slotPhase("b") !== "filled") return;
    if (!wire.canAccept) return;
    const va = node.consume("a");
    const vb = node.consume("b");
    wire.load([va, vb]);
  }, [nodeRef, outWireRef]);

  return <Node ref={nodeRef} slots={["a", "b"]} onRun={run} />;
}

export function ReadGateBody({
  nodeRef,
}: {
  nodeRef: RefObject<NodeHandle | null>;
}) {
  return (
    <>
      <Node ref={nodeRef} slots={["in0"]} />
      <ManualTakeButton
        nodeRef={nodeRef}
        slotId="in0"
        onConsume={() => nodeRef.current?.requestConsume("in0")}
      />
    </>
  );
}
