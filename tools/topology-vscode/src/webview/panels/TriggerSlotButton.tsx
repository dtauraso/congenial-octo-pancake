import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getTriggerSlots, getWiresVersion, subscribeWires,
} from "../../substrate/runtime-wires";
import type { TriggerSlot } from "../../substrate/runtime-wires-shapes";

// Per-loop open/closed toggle. Click to open the gate; the upstream
// loop streams. Click again to close; the loop parks before its next
// send. Independent of the wire's manual-ack — this gates the sender,
// not the receiver slot.

function OneTriggerButton({ slot }: { slot: TriggerSlot }) {
  const [open, setOpen] = useState<boolean>(slot.gate.isOpen());
  useEffect(() => {
    setOpen(slot.gate.isOpen());
    return slot.gate.subscribe(() => setOpen(slot.gate.isOpen()));
  }, [slot]);
  return (
    <button
      type="button"
      className="run-btn"
      title={`${open ? "close" : "open"} ${slot.label} gate`}
      onClick={() => slot.gate.toggle()}
    >
      {open ? "■" : "▶"} {slot.label}
    </button>
  );
}

export function TriggerSlotButton() {
  useSyncExternalStore(subscribeWires, getWiresVersion, getWiresVersion);
  const slots = getTriggerSlots();
  const mount = document.getElementById("run-mount");
  if (!mount || slots.length === 0) return null;
  return createPortal(
    <>{slots.map((s) => <OneTriggerButton key={s.id} slot={s} />)}</>,
    mount,
  );
}
