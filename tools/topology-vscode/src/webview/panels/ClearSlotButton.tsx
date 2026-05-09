import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  clearManualAckSlot, getManualAckEdgeId, getWiresMap, getWiresVersion,
  subscribeWires,
} from "../../substrate/runtime-wires";

// "B says room → A sends": this button is B's room-signal for the
// in0→readGate link. Clicking clears the slot at readGate; the input
// loop, which has been waiting on awaitReady, then sends the next pulse.
export function ClearSlotButton() {
  useSyncExternalStore(subscribeWires, getWiresVersion, getWiresVersion);
  const edgeId = getManualAckEdgeId();
  const wire = edgeId ? getWiresMap()?.get(edgeId) ?? null : null;
  const [occupied, setOccupied] = useState<boolean>(wire?.state === "inFlight");

  useEffect(() => {
    if (!wire) { setOccupied(false); return; }
    setOccupied(wire.state === "inFlight");
    const offArrive = wire.onArrive(() => setOccupied(true));
    const offAck = wire.onAck(() => setOccupied(false));
    return () => { offArrive(); offAck(); };
  }, [wire]);

  const mount = document.getElementById("run-mount");
  if (!mount) return null;
  if (!edgeId) return null;
  return createPortal(
    <button
      type="button"
      className="run-btn"
      title="clear slot at readGate (room available)"
      disabled={!occupied}
      onClick={() => { clearManualAckSlot(); }}
    >
      ⏏ clear slot
    </button>,
    mount,
  );
}
