// Imperative RF handle — registered by Inner() on mount so non-React modules
// (inline-edit.ts, etc.) can call setNodes/setEdges without hooks.
// Callers must guard against null (before Inner mounts or after unmount).

import type { Dispatch, SetStateAction } from "react";
import type { Edge as RFEdge, Node as RFNode } from "reactflow";

type SetNodes = Dispatch<SetStateAction<RFNode[]>>;
type SetEdges = Dispatch<SetStateAction<RFEdge[]>>;

let _setNodes: SetNodes | null = null;
let _setEdges: SetEdges | null = null;

export function registerRFSetters(sn: SetNodes, se: SetEdges) {
  _setNodes = sn;
  _setEdges = se;
}

export function rfSetNodes(updater: (ns: RFNode[]) => RFNode[]) {
  _setNodes?.(updater);
}

export function rfSetEdges(updater: (es: RFEdge[]) => RFEdge[]) {
  _setEdges?.(updater);
}
