// useTickDriver: substrate tick driver as a React hook at the topology
// root. Owns the ordinal tick count and the halted flag.
//
// One round: walk all nodes once (call run()), then observe wires
// returning to `empty`. The round closes when every wire is empty —
// event-driven, not time-driven. On close, the ordinal tick increments
// and (if not halted) the next round starts.
//
// step() advances one round even when halted. halt() prevents further
// auto-advance; a round in flight (e.g. a wire waiting on manual-take)
// continues to wait, as MODEL.md requires.

import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import type { WireHandle } from "./Wire";
import type { NodeHandle } from "./Node";

export interface TickDriverConfig {
  nodeRefs: RefObject<NodeHandle | null>[];
  wireRefs: RefObject<WireHandle | null>[];
}

export interface TickDriverHandle {
  readonly tick: number;
  readonly halted: boolean;
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

  const advance = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const { nodeRefs, wireRefs } = configRef.current;
    const wires = wireRefs.map((r) => r.current).filter(
      (w): w is WireHandle => w !== null,
    );

    for (const r of nodeRefs) r.current?.run();

    // No-work round: nothing left empty before run() departed from
    // empty during run(). Close once; do NOT auto-advance (the
    // substrate is idle, advancing again is pointless and would spin).
    if (wires.every((w) => w.phase.kind === "empty")) {
      inFlightRef.current = false;
      setTick((t) => t + 1);
      return;
    }

    const unsubs: Array<() => void> = [];
    let closed = false;
    const check = () => {
      if (closed) return;
      if (!wires.every((w) => w.phase.kind === "empty")) return;
      closed = true;
      for (const u of unsubs) u();
      inFlightRef.current = false;
      setTick((t) => t + 1);
      // Defer auto-advance to break sync recursion through subscribePhase.
      if (!haltedRef.current) queueMicrotask(advance);
    };
    for (const w of wires) unsubs.push(w.subscribePhase(check));
  }, []);

  const halt = useCallback(() => setHalted(true), []);
  const resume = useCallback(() => {
    setHalted(false);
    if (!inFlightRef.current) advance();
  }, [advance]);
  const step = useCallback(() => {
    if (!inFlightRef.current) advance();
  }, [advance]);

  return useMemo(
    () => ({ tick, halted, halt, resume, step }),
    [tick, halted, halt, resume, step],
  );
}
