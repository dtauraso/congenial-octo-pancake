import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeChange,
  type EdgeChange,
  type Viewport,
} from "reactflow";
import { parseSpec, type Spec } from "../../schema";
import { resetAnimations } from "../render/animation";
import { beginRenameNodeId, setRenameRerender } from "../rename";
import { vscode } from "../save";
import { setSpec, setViewerState, viewerState } from "../state";
import {
  parseViewerState,
  serializeViewerState,
  type ViewerState,
} from "../viewerState";
import { specToFlow } from "./adapter";
import { AnimatedEdge } from "./AnimatedEdge";
import { AnimatedNode } from "./AnimatedNode";
import { notifyPanStart, register } from "./bridge";
import { boxToViewport, viewportToBox } from "./camera";
import { setDuration, startTickLoop } from "../playback";

const EDGE_TYPES = { animated: AnimatedEdge };
const NODE_TYPES = { animated: AnimatedNode };

function parseDur(s: string | undefined): number {
  if (!s) return 27000;
  if (s.endsWith("ms")) return parseFloat(s);
  if (s.endsWith("s")) return parseFloat(s) * 1000;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 27000;
}

type Msg =
  | { type: "load"; text: string }
  | { type: "view-load"; text?: string }
  | { type: "topogen-status"; [k: string]: unknown }
  | { type: "run-status"; [k: string]: unknown };

function Inner() {
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const [dimmed, setDimmed] = useState<Set<string> | null>(null);
  const selectedRef = useRef<Set<string>>(new Set());
  const lastSyncedView = useRef<string | undefined>(undefined);
  const viewSaveTimer = useRef<number | undefined>(undefined);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const lastSpec = useRef<Spec | null>(null);
  const rf = useReactFlow();

  // Bridge handlers (camera, dim, selection getter).
  useEffect(() => {
    register({
      setViewBox: (vb) => {
        const pane = paneRef.current;
        if (!pane) return;
        const { width, height } = pane.getBoundingClientRect();
        rf.setViewport(boxToViewport(vb, width, height));
      },
      getViewBox: () => {
        const pane = paneRef.current;
        if (!pane) return { x: 0, y: 0, w: 0, h: 0 };
        const { width, height } = pane.getBoundingClientRect();
        return viewportToBox(rf.getViewport(), width, height);
      },
      setDim: (members) => setDimmed(members ? new Set(members) : null),
      getSelectedNodeIds: () => Array.from(selectedRef.current),
    });
    setRenameRerender(() => {
      // Spec was mutated in place by rename; rebuild RF nodes/edges from it.
      if (!lastSpec.current) return;
      const flow = specToFlow(lastSpec.current);
      setNodes(flow.nodes);
      setEdges(flow.edges);
    });
  }, [rf]);

  useEffect(() => {
    const handler = (e: MessageEvent<Msg>) => {
      const msg = e.data;
      if (msg.type === "load") {
        try {
          const next: Spec = parseSpec(JSON.parse(msg.text));
          setSpec(next);
          lastSpec.current = next;
          if (next.timing) {
            setDuration(parseDur(next.timing.duration));
            startTickLoop();
          }
          resetAnimations();
          const flow = specToFlow(next);
          setNodes(flow.nodes);
          setEdges(flow.edges);
        } catch (err) {
          console.error("invalid topology.json", err);
        }
      } else if (msg.type === "view-load") {
        const next: ViewerState = parseViewerState(msg.text);
        setViewerState(next);
        lastSyncedView.current = msg.text ?? serializeViewerState(next);
        const c = next.camera;
        if (c && typeof c.zoom === "number") {
          rf.setViewport({ x: c.x, y: c.y, zoom: c.zoom });
        } else if (c) {
          const pane = paneRef.current;
          if (pane) {
            const { width, height } = pane.getBoundingClientRect();
            rf.setViewport(boxToViewport({ x: c.x, y: c.y, w: c.w, h: c.h }, width, height));
          }
        }
      }
    };
    window.addEventListener("message", handler);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, [rf]);

  const persistViewport = useCallback((vp: Viewport) => {
    if (viewSaveTimer.current !== undefined) {
      window.clearTimeout(viewSaveTimer.current);
    }
    viewSaveTimer.current = window.setTimeout(() => {
      viewSaveTimer.current = undefined;
      viewerState.camera = { x: vp.x, y: vp.y, w: 0, h: 0, zoom: vp.zoom };
      const text = serializeViewerState(viewerState);
      if (text === lastSyncedView.current) return;
      lastSyncedView.current = text;
      vscode.postMessage({ type: "view-save", text });
    }, 400);
  }, []);

  const onMoveStart = useCallback(() => { notifyPanStart(); }, []);
  const onMoveEnd = useCallback((_: unknown, vp: Viewport) => {
    persistViewport(vp);
  }, [persistViewport]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((es) => applyEdgeChanges(changes, es)),
    []
  );
  const onSelectionChange = useCallback(
    ({ nodes: sel }: { nodes: RFNode[] }) => {
      selectedRef.current = new Set(sel.map((n) => n.id));
    },
    []
  );
  const onNodeDoubleClick = useCallback(
    (ev: React.MouseEvent, node: RFNode) => {
      // Anchor the input over the node wrapper, not whichever inner element
      // happened to receive the click (label / state-text divs are smaller
      // than the node and would offset the input).
      const t = ev.target as HTMLElement | null;
      const wrapper =
        t?.closest<HTMLElement>(".react-flow__node") ??
        (ev.currentTarget as HTMLElement);
      // Prefer the label element so the input sits exactly where the id text
      // is drawn — content can be vertically offset when a node also renders
      // state-text lines.
      const label = wrapper.querySelector<HTMLElement>(".node-label");
      beginRenameNodeId(node.id, label);
    },
    []
  );

  const styledNodes = dimmed
    ? nodes.map((n) => ({ ...n, className: dimmed.has(n.id) ? "" : "dim" }))
    : nodes;
  const styledEdges = dimmed
    ? edges.map((e) => ({
        ...e,
        className: dimmed.has(e.source) && dimmed.has(e.target) ? "" : "dim",
      }))
    : edges;

  return (
    <div ref={paneRef} style={{ position: "absolute", inset: 0 }}>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={onNodeDoubleClick}
        minZoom={0.1}
        maxZoom={4}
        fitView
        deleteKeyCode={null}
        nodesConnectable={false}
        edgeTypes={EDGE_TYPES}
        nodeTypes={NODE_TYPES}
      >
        <Background gap={24} />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}
