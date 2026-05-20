import { createContext, useContext } from "react";

export interface EdgeActions {
  setEdgeLane: (edgeId: string, lane: number) => void;
}

export const EdgeActionsCtx = createContext<EdgeActions | null>(null);

export function useEdgeActions(): EdgeActions | null {
  return useContext(EdgeActionsCtx);
}
