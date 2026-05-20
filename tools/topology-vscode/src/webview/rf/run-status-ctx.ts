import { createContext, useContext } from "react";
import type { RunStatusUI } from "./run-status-state";

export const RunStatusCtx = createContext<RunStatusUI>({ state: "idle" });

export function useRunStatusCtx(): RunStatusUI {
  return useContext(RunStatusCtx);
}
