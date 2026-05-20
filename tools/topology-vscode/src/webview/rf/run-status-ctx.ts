import { createContext, useContext } from "react";
import type { RunStatusUI } from "../state/store";

export const RunStatusCtx = createContext<RunStatusUI>({ state: "idle" });

export function useRunStatusCtx(): RunStatusUI {
  return useContext(RunStatusCtx);
}
