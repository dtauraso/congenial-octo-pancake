// HTML manual-consume affordance. Subscribes to the destination
// node's slot phase via NodeHandle.subscribeSlot; enabled iff the slot
// is "filled". Rendered inside the host node's HTML body so it lives
// in the same DOM layer as the React Flow node wrapper.

import { useEffect, useState, type RefObject } from "react";
import type { NodeHandle, SlotPhase } from "../substrate-r/Node";

export function ManualTakeButton({
  nodeRef, slotId, onConsume,
}: {
  nodeRef: RefObject<NodeHandle | null>;
  slotId: string;
  onConsume: () => void;
}) {
  const [phase, setPhase] = useState<SlotPhase | undefined>(undefined);

  useEffect(() => {
    const handle = nodeRef.current;
    if (!handle) return;
    setPhase(handle.slotPhase(slotId));
    return handle.subscribeSlot(slotId, setPhase);
  }, [nodeRef, slotId]);

  const armed = phase === "filled";
  return (
    <button
      type="button"
      disabled={!armed}
      onClick={armed ? onConsume : undefined}
      data-armed={armed ? "true" : "false"}
      data-input-id={slotId}
      style={{
        marginLeft: 6,
        padding: "1px 6px",
        fontSize: 11,
        lineHeight: 1.2,
        background: "#fff",
        border: "1px solid #333",
        borderRadius: 3,
        cursor: armed ? "pointer" : "default",
        opacity: armed ? 1 : 0.5,
      }}
    >
      ⌫
    </button>
  );
}
