import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  clearManualAckSlot, getManualAckEdges, getWiresMap, getWiresVersion,
  subscribeWires,
} from "../../substrate/runtime-wires";
import type { Wire } from "../../substrate/wire";

// "B says room → A sends": one button per manual-ack edge. Clicking
// clears the slot at the receiver; the upstream loop, which has been
// waiting on awaitReady, then sends the next pulse.

function OneClearButton({ edgeId, label, wire }: { edgeId: string; label: string; wire: Wire | null }) {
  const [occupied, setOccupied] = useState<boolean>(wire?.state === "inFlight");
  useEffect(() => {
    if (!wire) { setOccupied(false); return; }
    setOccupied(wire.state === "inFlight");
    const offArrive = wire.onArrive(() => setOccupied(true));
    const offAck = wire.onAck(() => setOccupied(false));
    return () => { offArrive(); offAck(); };
  }, [wire]);
  return (
    <button
      type="button"
      className="run-btn"
      title={`clear slot on ${label} (room available)`}
      disabled={!occupied}
      onClick={() => { clearManualAckSlot(edgeId); }}
    >
      ⏏ {label}
    </button>
  );
}

function ClearAllButton({ edgeIds, wires }: { edgeIds: string[]; wires: ReturnType<typeof getWiresMap> }) {
  const [anyOccupied, setAnyOccupied] = useState(false);
  useEffect(() => {
    const recompute = () => {
      setAnyOccupied(edgeIds.some((id) => wires?.get(id)?.state === "inFlight"));
    };
    recompute();
    const offs = edgeIds.flatMap((id) => {
      const w = wires?.get(id);
      if (!w) return [];
      return [w.onArrive(recompute), w.onAck(recompute)];
    });
    return () => { for (const off of offs) off(); };
  }, [edgeIds, wires]);
  return (
    <button
      type="button"
      className="run-btn"
      title="clear both readGate slots simultaneously"
      disabled={!anyOccupied}
      onClick={() => { for (const id of edgeIds) clearManualAckSlot(id); }}
    >
      ⏏ both
    </button>
  );
}

export function ClearSlotButton() {
  useSyncExternalStore(subscribeWires, getWiresVersion, getWiresVersion);
  const edges = getManualAckEdges();
  const wires = getWiresMap();
  const mount = document.getElementById("run-mount");
  if (!mount || edges.length === 0) return null;
  return createPortal(
    <>
      {edges.map((e) => (
        <OneClearButton key={e.id} edgeId={e.id} label={e.label} wire={wires?.get(e.id) ?? null} />
      ))}
      {edges.length > 1 && <ClearAllButton edgeIds={edges.map((e) => e.id)} wires={wires} />}
    </>,
    mount,
  );
}
