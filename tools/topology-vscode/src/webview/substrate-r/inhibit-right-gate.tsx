import { useCallback, useEffect, useRef, type RefObject } from "react";
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
  const lastSkipReasonRef = useRef<string | null>(null);
  const run = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    // Inhibition rule: consume both slots; fire output only when left arrived
    // and right did not. Primitives are silent no-ops on empty slots.
    const leftFilled = node.slotPhase(leftSlotId) === "filled";
    const rightFilled = node.slotPhase(rightSlotId) === "filled";
    const leftValue = node.consume(leftSlotId);
    node.consume(rightSlotId);
    const wire = outWireRef.current;
    if (leftFilled && !rightFilled && wire) {
      if (traceId) postLog("trace.inhibitrightgate.fire", { node: traceId });
      lastSkipReasonRef.current = null;
      wire.load(leftValue);
    } else if (traceId) {
      const reason = !leftFilled ? "no-left" : rightFilled ? "inhibited" : "no-out-wire";
      if (reason !== lastSkipReasonRef.current) {
        postLog("trace.inhibitrightgate.skip", { node: traceId, reason });
        lastSkipReasonRef.current = reason;
      }
    }
  }, [nodeRef, outWireRef, leftSlotId, rightSlotId, traceId]);

  useEffect(() => {
    let raf = 0;
    const step = () => { run(); raf = requestAnimationFrame(step); }; // vocab-ok: visual layer
    raf = requestAnimationFrame(step); // vocab-ok: visual layer
    return () => cancelAnimationFrame(raf);
  }, [run]);

  return <Node ref={nodeRef} slots={[leftSlotId, rightSlotId]} onRun={run} traceId={traceId} />;
}
