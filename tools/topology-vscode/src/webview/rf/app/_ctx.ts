import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { Edge as RFEdge, Node as RFNode, ReactFlowInstance } from "reactflow";
import type { Spec } from "../../../schema";

// Bundle of refs / setters / helpers shared across the app's hooks.
// Built once inside Inner() and threaded through each useXxx hook so
// hooks don't have to grow a wide explicit arg list every time a new
// shared field appears.
export type AppCtx = {
  setNodes: Dispatch<SetStateAction<RFNode[]>>;
  setEdges: Dispatch<SetStateAction<RFEdge[]>>;
  lastSpec: MutableRefObject<Spec | null>;
  reconnectOk: MutableRefObject<boolean>;
  paneRef: MutableRefObject<HTMLDivElement | null>;
  flashIdsRef: MutableRefObject<Set<string>>;
  flashTimerRef: MutableRefObject<number | null>;
  rebuildFlow: () => void;
  rf: ReactFlowInstance;
};
