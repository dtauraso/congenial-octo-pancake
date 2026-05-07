import { useCallback, useEffect, useRef, useState } from "react";
import {
  subscribe, subscribeState, getConcurrentEdges, getSimTime,
  ruleForNodeId, signalRendererComplete,
  tryClaimVisualSlot, releaseVisualSlot,
} from "../../../sim/runner";
import { notify } from "../../../sim/event-bus";
import { slog } from "../../../substrate/log";
import { type Pulse, formatRidingValue } from "./_constants";

export function usePulseLanes(id: string) {
  const [pulses0, setPulses0] = useState<Pulse[]>([]);
  const [pulses1, setPulses1] = useState<Pulse[]>([]);
  const len0Ref = useRef(0);
  const len1Ref = useRef(0);
  len0Ref.current = pulses0.length;
  len1Ref.current = pulses1.length;
  const pulseKeyRef = useRef(0);
  const [concurrent, setConcurrent] = useState(() => getConcurrentEdges().has(id));
  const concurrentRef = useRef(concurrent);
  concurrentRef.current = concurrent;

  useEffect(() => {
    const update = () => setConcurrent(getConcurrentEdges().has(id));
    update();
    return subscribeState(update);
  }, [id]);

  // Release any held visual slots if the edge itself unmounts (e.g.
  // fold collapsed it). Without this the per-edge slot ledger leaks.
  useEffect(() => {
    return () => {
      const held = len0Ref.current + len1Ref.current;
      for (let i = 0; i < held; i++) releaseVisualSlot(id);
    };
  }, [id]);

  useEffect(() => {
    slog("ae-subscribed", { edgeId: id });
    const unsub = subscribe((ev) => {
      if (ev.type !== "emit") return;
      if (ev.edgeId !== id) return;
      const rule = ruleForNodeId(ev.fromNodeId);
      slog("ae-received", { edgeId: id, value: String(ev.value), cap: rule.maxConcurrentPerEdge });
      if (!tryClaimVisualSlot(id, rule.maxConcurrentPerEdge)) {
        slog("ae-rejected", { edgeId: id, value: String(ev.value) });
        return;
      }
      slog("ae-mounting", { edgeId: id, value: String(ev.value) });
      const key = ++pulseKeyRef.current;
      const pulse: Pulse = {
        key, pulseId: ev.pulseId,
        value: formatRidingValue(ev.value),
        simStart: getSimTime(),
      };
      if (concurrentRef.current && len1Ref.current < len0Ref.current) {
        len1Ref.current += 1;
        setPulses1((cur) => [...cur, pulse]);
      } else {
        len0Ref.current += 1;
        setPulses0((cur) => [...cur, pulse]);
      }
    });
    // Fire AFTER subscribe so substrate's synchronous response (an
    // emit) has a registered listener. Firing before subscribe drops
    // the first emit and stalls the ack-driven loop.
    notify({ type: "edge-ready", edgeId: id });
    return unsub;
  }, [id]);

  // Drop-by-key, not slice(1): pulses animate concurrently and a
  // shorter-arc geometry change could let a later pulse finish first.
  const advanceLane0 = useCallback((key: number, pulseId: string) => {
    signalRendererComplete(pulseId);
    releaseVisualSlot(id);
    setPulses0((cur) => cur.filter((p) => p.key !== key));
    if (len0Ref.current > 0) len0Ref.current -= 1;
    notify({ type: "pulse-ack", edgeId: id, pulseId });
  }, [id]);
  const advanceLane1 = useCallback((key: number, pulseId: string) => {
    signalRendererComplete(pulseId);
    releaseVisualSlot(id);
    setPulses1((cur) => cur.filter((p) => p.key !== key));
    if (len1Ref.current > 0) len1Ref.current -= 1;
    notify({ type: "pulse-ack", edgeId: id, pulseId });
  }, [id]);

  return { pulses0, pulses1, concurrent, advanceLane0, advanceLane1 };
}
