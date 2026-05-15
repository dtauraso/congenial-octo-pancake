import { useCallback, useMemo, useRef, useState } from "react";
import { createPauseAxis, type PauseAxis } from "./pause-axis";

export interface DriverHandle {
  readonly halted: boolean;
  readonly pauseAxis: PauseAxis;
  halt(): void;
  resume(): void;
}

export function useDriver(): DriverHandle {
  const [halted, setHalted] = useState(false);
  const pauseAxisRef = useRef<PauseAxis | null>(null);
  if (!pauseAxisRef.current) pauseAxisRef.current = createPauseAxis();
  const pauseAxis = pauseAxisRef.current;

  const halt = useCallback(() => { setHalted(true); pauseAxis.set(true); }, [pauseAxis]);
  const resume = useCallback(() => { pauseAxis.set(false); setHalted(false); }, [pauseAxis]);

  return useMemo(
    () => ({ halted, pauseAxis, halt, resume }),
    [halted, pauseAxis, halt, resume],
  );
}
