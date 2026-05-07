// Wire-driven variant of usePulseLanes. Subscribes to a substrate
// Wire (point-to-point) instead of the legacy global event bus. Arc
// completion calls ackWire(wire) directly — no edge-ready signal, no
// pulse-concurrency ledger, no notify(pulse-ack). Concurrency is
// bounded by the wire's cap (0/1) by construction, so there is only
// one lane.

import { useCallback, useEffect, useRef, useState } from "react";
import { ackWire, type Wire } from "../../../substrate/wire";
import { getSimTime } from "../../../sim/runner";
import { slog } from "../../../substrate/log";
import { type Pulse, formatRidingValue } from "./_constants";

let _pulseSeq = 0;
function nextWirePulseId(): string { _pulseSeq += 1; return `w${_pulseSeq}`; }

export function usePulseLanesWire(id: string, wire: Wire) {
  const [pulses0, setPulses0] = useState<Pulse[]>([]);
  const wireRef = useRef(wire);
  wireRef.current = wire;
  const pulseKeyRef = useRef(0);

  useEffect(() => {
    slog("ae-wire-subscribed", { edgeId: id });
    const mount = (value: unknown) => {
      slog("ae-wire-received", { edgeId: id, value: String(value) });
      const key = ++pulseKeyRef.current;
      const pulse: Pulse = {
        key,
        pulseId: nextWirePulseId(),
        value: formatRidingValue(value),
        simStart: getSimTime(),
      };
      setPulses0((cur) => [...cur, pulse]);
    };
    // Wires-runtime starts loops synchronously before this hook
    // mounts, so the first send may already be in flight. Pick up the
    // pending value rather than dropping it and stalling the loop.
    if (wire.state === "inFlight" && wire.pending !== null) mount(wire.pending);
    const off = wire.onArrive(mount);
    return () => {
      off();
      setPulses0([]);
    };
  }, [id, wire]);

  const advanceLane0 = useCallback((key: number) => {
    setPulses0((cur) => cur.filter((p) => p.key !== key));
    const w = wireRef.current;
    if (w.state === "inFlight") ackWire(w);
  }, []);

  return { pulses0, pulses1: [] as Pulse[], concurrent: false, advanceLane0, advanceLane1: () => {} };
}
