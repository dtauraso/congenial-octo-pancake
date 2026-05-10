// Ticked-substrate variant of usePulseLanes. Subscribes to
// publishEdgeArrive events from ticked/runtime.ts (one per ctx.send).
// One pulse per arrival; advance just removes it (no ack model — the
// ticked substrate is step-driven, not pulse-paced).

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeEdgeArrive } from "../../../substrate/node-streams";
import type { StateValue } from "../../../schema";
import { type Pulse, formatRidingValue } from "./_constants";

let _seq = 0;
function nextId(): string { _seq += 1; return `t${_seq}`; }

export function usePulseLanesTicked(id: string, enabled: boolean) {
  const [pulses0, setPulses0] = useState<Pulse[]>([]);
  const keyRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const off = subscribeEdgeArrive((edgeId: string, value: StateValue) => {
      if (edgeId !== id) return;
      const key = ++keyRef.current;
      setPulses0((cur) => [...cur, {
        key, pulseId: nextId(),
        value: formatRidingValue(value),
        simStart: performance.now(),
      }]);
    });
    return () => { off(); setPulses0([]); };
  }, [id, enabled]);

  const advanceLane0 = useCallback((key: number) => {
    setPulses0((cur) => cur.filter((p) => p.key !== key));
  }, []);

  return {
    pulses0, pulses1: [] as Pulse[],
    concurrent: false, advanceLane0, advanceLane1: () => {},
  };
}
