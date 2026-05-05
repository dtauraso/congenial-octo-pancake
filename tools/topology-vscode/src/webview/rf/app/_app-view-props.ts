import type { MutableRefObject } from "react";
import type {
  Connection, Edge as RFEdge, Node as RFNode,
  EdgeChange, NodeChange, Viewport,
} from "reactflow";
import type { EdgeKind } from "../../../schema";
import type { CompareMode } from "../CompareToolbar";
import type { EdgeMenu } from "./_use-edge-handlers";

export type AppViewProps = {
  paneRef: MutableRefObject<HTMLDivElement | null>;
  ghostFront: boolean;
  styledNodes: RFNode[];
  styledEdges: RFEdge[];
  guides: { vx: number | null; hy: number | null };
  edgeMenu: EdgeMenu;
  compareMode: CompareMode;
  comparisonLabel: string | null;
  compareError: string | null;
  onNodesChange: (c: NodeChange[]) => void;
  onEdgesChange: (c: EdgeChange[]) => void;
  onMoveEnd: (e: unknown, vp: Viewport) => void;
  onSelectionChange: (p: { nodes: RFNode[] }) => void;
  onNodeDoubleClick: (ev: React.MouseEvent, n: RFNode) => void;
  onNodeContextMenu: (ev: React.MouseEvent, n: RFNode) => void;
  onSelectionContextMenu: (ev: React.MouseEvent, n: RFNode[]) => void;
  onNodeDrag: (ev: React.MouseEvent, n: RFNode) => void;
  onNodeDragStop: (ev: React.MouseEvent, n: RFNode) => void;
  onNodesDelete: (n: RFNode[]) => void;
  onEdgesDelete: (e: RFEdge[]) => void;
  onConnect: (c: Connection) => void;
  isValidConnection: (c: Connection) => boolean;
  onReconnect: (e: RFEdge, c: Connection) => void;
  onReconnectStart: () => void;
  onReconnectEnd: () => void;
  onEdgeContextMenu: (ev: React.MouseEvent, e: RFEdge) => void;
  closeEdgeMenu: () => void;
  setEdgeKind: (id: string, k: EdgeKind) => void;
  setCompareMode: (m: CompareMode) => void;
  closeCompare: () => void;
  onDragOver: (ev: React.DragEvent) => void;
  onDrop: (ev: React.DragEvent) => void;
};
