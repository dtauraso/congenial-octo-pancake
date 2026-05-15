import { useCallback, type RefObject } from "react";
import { Node, type NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";
import { postLog } from "../log/post";

export function InhibitRightGateBody({
  nodeRef,
  outWireRef,
  leftSlotId = "left",
  rightSlotId = "right",
  traceId,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  leftSlotId?: string;
  rightSlotId?: string;
  traceId?: string;
}) {
  const run = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    const leftFilled = node.slotPhase(leftSlotId) === "filled";
    const rightFilled = node.slotPhase(rightSlotId) === "filled";

    if (leftFilled && rightFilled) {
      node.consume(leftSlotId);
      node.consume(rightSlotId);
      if (traceId) postLog("trace.inhibitrightgate.skip", { node: traceId, reason: "both-filled" });
      return;
    }
    if (rightFilled) {
      node.consume(rightSlotId);
      if (traceId) postLog("trace.inhibitrightgate.skip", { node: traceId, reason: "right-only" });
      return;
    }
    if (!leftFilled) return;

    const wire = outWireRef.current;
    if (wire && !wire.canAccept) return;
    node.consume(leftSlotId);
    if (wire) {
      if (traceId) postLog("trace.inhibitrightgate.fire", { node: traceId });
      wire.load(1);
    } else {
      if (traceId) postLog("trace.inhibitrightgate.skip", { node: traceId, reason: "no-out-wire-drain" });
    }
  }, [nodeRef, outWireRef, leftSlotId, rightSlotId, traceId]);

  return <Node ref={nodeRef} slots={[leftSlotId, rightSlotId]} onRun={run} traceId={traceId} />;
}
