// useTickDriver: substrate tick driver as a cohort cursor. Tick is the
// cohort cursor — a single observable axis the user can scrub. step()
// walks the nodes once and releases the current cohort through the
// global play/pause gate; wires of that cohort that finish their RAF
// then dispatch `arrive` (parked wires resume from the gate). When
// every wire of the current cohort is `empty`, the cursor advances.
//
// halt freezes the cursor; resume advances it again. The legacy
// "all wires empty" round-close is retired — round-close is now
// per-cohort, off the gate.

import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import type { WireHandle } from "./Wire";
import type { NodeHandle } from "./Node";
import { createCohortGate, type CohortGate } from "./cohort-gate";

export interface TickDriverConfig {
  nodeRefs: RefObject<NodeHandle | null>[];
  wireRefs: RefObject<WireHandle | null>[];
  gate?: CohortGate;
}

export interface TickDriverHandle {
  readonly tick: number;
  readonly halted: boolean;
  readonly gate: CohortGate;
  halt(): void;
  resume(): void;
  step(): void;
}

export function useTickDriver(config: TickDriverConfig): TickDriverHandle {
  const [tick, setTick] = useState(0);
  const [halted, setHalted] = useState(false);
  const haltedRef = useRef(halted);
  haltedRef.current = halted;
  const inFlightRef = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;
  const gateRef = useRef<CohortGate | null>(null);
  if (!gateRef.current) gateRef.current = config.gate ?? createCohortGate();
  const gate = gateRef.current;
  const cursorRef = useRef(0);

  const advance = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const cohort = cursorRef.current;
    const { nodeRefs, wireRefs } = configRef.current;
    const wires = wireRefs.map((r) => r.current).filter(
      (w): w is WireHandle => w !== null,
    );
    const cohortWires = wires.filter((w) => (w.cohort ?? 0) === cohort);

    for (const r of nodeRefs) r.current?.run();
    gate.release(cohort);

    if (cohortWires.every((w) => w.phase.kind === "empty")) {
      inFlightRef.current = false;
      cursorRef.current = cohort + 1;
      setTick(cohort + 1);
      if (!haltedRef.current) requestAnimationFrame(advance);
      return;
    }

    const unsubs: Array<() => void> = [];
    let closed = false;
    const check = () => {
      if (closed) return;
      if (!cohortWires.every((w) => w.phase.kind === "empty")) return;
      closed = true;
      for (const u of unsubs) u();
      inFlightRef.current = false;
      cursorRef.current = cohort + 1;
      setTick(cohort + 1);
      if (!haltedRef.current) queueMicrotask(advance);
    };
    for (const w of cohortWires) unsubs.push(w.subscribePhase(check));
  }, [gate]);

  const halt = useCallback(() => setHalted(true), []);
  const resume = useCallback(() => {
    setHalted(false);
    if (!inFlightRef.current) advance();
  }, [advance]);
  const step = useCallback(() => {
    if (!inFlightRef.current) advance();
  }, [advance]);

  return useMemo(
    () => ({ tick, halted, gate, halt, resume, step }),
    [tick, halted, gate, halt, resume, step],
  );
}
