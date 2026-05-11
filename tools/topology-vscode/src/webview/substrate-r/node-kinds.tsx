// Node-kind implementations for the new substrate. Each kind is a
// React hook that wraps <Node> with kind-specific onRun behavior and
// input descriptors.
//
// Input: emits values from an init queue whenever its output wire is
// empty; acks the output wire when it becomes taken (long-lived
// subscription, independent of the tick).
//
// ReadGate: manual-take destination on its input wire. No output
// emission yet — current working topology terminates here. When/if
// downstream consumers exist, ReadGate will also drive its output on
// take.

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Node, type NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";

export function InputBody({
  nodeRef, outWireRef, initialQueue,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  initialQueue: unknown[];
}) {
  const remainingRef = useRef([...initialQueue]);

  useEffect(() => {
    const handle = outWireRef.current;
    if (!handle) return;
    return handle.subscribePhase((p) => {
      if (p.kind === "taken") handle.ack();
    });
  }, [outWireRef]);

  const run = useCallback(() => {
    const handle = outWireRef.current;
    if (!handle) return;
    if (handle.phase.kind !== "empty") return;
    if (remainingRef.current.length === 0) return;
    handle.load(remainingRef.current.shift());
  }, [outWireRef]);

  return <Node ref={nodeRef} onRun={run} />;
}

export function ReadGateBody({
  nodeRef, inWireRef,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  inWireRef: RefObject<WireHandle | null>;
}) {
  return (
    <Node
      ref={nodeRef}
      inputs={[{ id: "in0", wireRef: inWireRef, manualTake: true }]}
    />
  );
}
