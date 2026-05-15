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
    const wire = outWireRef.current;
    if (!node) return;

    if (node.slotPhase(rightSlotId) === "filled") {
      node.consume(rightSlotId);
      if (traceId) postLog("trace.inhibitrightgate.skip", { node: traceId, reason: "right-inhibited" });
      return;
    }

    if (!wire) return;
    if (node.slotPhase(leftSlotId) !== "filled") return;
    if (!wire.canAccept) return;

    node.consume(leftSlotId);
    if (traceId) postLog("trace.inhibitrightgate.fire", { node: traceId });
    wire.load(1);
  }, [nodeRef, outWireRef, leftSlotId, rightSlotId, traceId]);

  return <Node ref={nodeRef} slots={[leftSlotId, rightSlotId]} onRun={run} traceId={traceId} />;
}
