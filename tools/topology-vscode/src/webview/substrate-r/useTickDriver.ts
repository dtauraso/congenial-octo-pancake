// useTickDriver: substrate tick driver. step() runs every node's run()
// once, then waits for all wires to return to empty (legacy all-wires
// round-close). Tick increments each round-close.
//
// halt freezes the pause axis so every in-flight wire's RAF loop exits
// immediately. resume clears the pause axis and kicks the next advance.
// step() is atomic w.r.t. pause: captures wasPaused, clears it, advances,
// re-pauses at round-close if wasPaused.

import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import type { WireHandle } from "./Wire";
import type { NodeHandle } from "./Node";
import { createPauseAxis, type PauseAxis } from "./pause-axis";

export interface TickDriverConfig {
  nodeRefs: RefObject<NodeHandle | null>[];
  wireRefs: RefObject<WireHandle | null>[];
}

export interface TickDriverHandle {
  readonly tick: number;
  readonly halted: boolean;
  readonly pauseAxis: PauseAxis;
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
  const pauseAxisRef = useRef<PauseAxis | null>(null);
  if (!pauseAxisRef.current) pauseAxisRef.current = createPauseAxis();
  const pauseAxis = pauseAxisRef.current;
  const tickRef = useRef(0);
  const stepResumeToPausedRef = useRef(false);

  const advance = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const { nodeRefs, wireRefs } = configRef.current;
    const wires = wireRefs.map((r) => r.current).filter(
      (w): w is WireHandle => w !== null,
    );

    for (const r of nodeRefs) r.current?.run();

    if (wires.every((w) => w.phase.kind === "empty")) {
      inFlightRef.current = false;
      const nextTick = tickRef.current + 1;
      tickRef.current = nextTick;
      setTick(nextTick);
      if (stepResumeToPausedRef.current) {
        stepResumeToPausedRef.current = false;
        pauseAxis.set(true);
        return;
      }
      // Idle throttle: no wires animated this round, so nothing paid
      // frame time. RAF caps the spin rate so an idle topology can't
      // burn rounds faster than the display refresh.
      if (!haltedRef.current) requestAnimationFrame(advance); // vocab-ok: idle throttle
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
      const nextTick = tickRef.current + 1;
      tickRef.current = nextTick;
      setTick(nextTick);
      if (stepResumeToPausedRef.current) {
        stepResumeToPausedRef.current = false;
        pauseAxis.set(true);
        return;
      }
      // Re-entrancy guard: check() is called synchronously from a
      // wire's phase subscriber. Yield once so the current stack
      // unwinds before advance() runs again. Pacing was already paid
      // by the wire RAF that just arrived — no RAF needed here.
      if (!haltedRef.current) queueMicrotask(advance);
    };
    for (const w of wires) unsubs.push(w.subscribePhase(check));
  }, [pauseAxis]);

  const halt = useCallback(() => { setHalted(true); pauseAxis.set(true); }, [pauseAxis]);
  const resume = useCallback(() => {
    pauseAxis.set(false);
    setHalted(false);
    if (!inFlightRef.current) advance();
  }, [advance, pauseAxis]);
  const step = useCallback(() => {
    // step allows wires to animate even while halted; clear the pause
    // axis so in-flight wires can run their RAF loops this round.
    const wasPaused = pauseAxis.paused;
    pauseAxis.set(false);
    stepResumeToPausedRef.current = wasPaused;
    if (!inFlightRef.current) advance();
  }, [advance, pauseAxis]);

  return useMemo(
    () => ({ tick, halted, pauseAxis, halt, resume, step }),
    [tick, halted, pauseAxis, halt, resume, step],
  );
}
