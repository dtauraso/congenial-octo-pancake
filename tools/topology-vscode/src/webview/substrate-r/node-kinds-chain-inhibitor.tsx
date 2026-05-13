// ChainInhibitorBody: consumes its slot and forwards on tick when the
// out wire can accept. The manual ⇢ button stays as a debug aid that
// emits a literal `1` when the out wire is free.

import { useCallback, useState, type RefObject } from "react";
import { Node, type NodeHandle } from "./Node";
import type { WireHandle } from "./Wire";

export function ChainInhibitorBody({
  nodeRef, outWireRef, slotId = "in",
}: {
  nodeRef: RefObject<NodeHandle | null>;
  outWireRef: RefObject<WireHandle | null>;
  slotId?: string;
}) {
  const [canEmit, setCanEmit] = useState(false);

  const run = useCallback(() => {
    const node = nodeRef.current;
    const wire = outWireRef.current;
    if (!node || !wire) return;
    setCanEmit(wire.canAccept);
    if (node.slotPhase(slotId) !== "filled") return;
    if (!wire.canAccept) return;
    const value = node.consume(slotId);
    wire.load(value);
  }, [nodeRef, outWireRef, slotId]);

  const onEmit = useCallback(() => {
    const wire = outWireRef.current;
    if (!wire || !wire.canAccept) return;
    wire.load(1);
    setCanEmit(false);
  }, [outWireRef]);

  return (
    <>
      <Node ref={nodeRef} slots={[slotId]} onRun={run} />
      <button
        type="button"
        disabled={!canEmit}
        onClick={canEmit ? onEmit : undefined}
        data-armed={canEmit ? "true" : "false"}
        data-emit-id={slotId}
        style={{
          marginLeft: 6,
          padding: "1px 6px",
          fontSize: 11,
          lineHeight: 1.2,
          background: "#fff",
          border: "1px solid #333",
          borderRadius: 3,
          cursor: canEmit ? "pointer" : "default",
          opacity: canEmit ? 1 : 0.5,
        }}
      >
        ⇢
      </button>
    </>
  );
}
