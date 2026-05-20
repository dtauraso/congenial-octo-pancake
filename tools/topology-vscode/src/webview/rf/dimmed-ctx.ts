import { createContext, useContext } from "react";

export const DimmedCtx = createContext<Set<string> | null>(null);

export function useDimmedCtx(): Set<string> | null {
  return useContext(DimmedCtx);
}
