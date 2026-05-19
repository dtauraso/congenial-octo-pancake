import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlowProvider, applyEdgeChanges, applyNodeChanges, useReactFlow,
  type Edge as RFEdge, type EdgeChange, type Node as RFNode, type NodeChange, type Viewport,
} from "reactflow";
import { specToFlow } from "./adapter";
import { RunButton } from "./panels/RunButton";
import { SaveLifecycle } from "../SaveLifecycle";
import { TimelinePanel } from "./panels/TimelinePanel";
import { scheduleViewSave } from "../save";
import { patchViewerState, useDimmed, viewerState } from "../state";
import { AppView } from "./app/AppView";
import { decorate } from "./app/_decorate";
import { useDeleteHandlers } from "./app/_handle-delete";
import { useDragDrop } from "./app/_use-drag-drop";
import { useEdgeHandlers } from "./app/_use-edge-handlers";
import { useFitViewHotkeys } from "./app/_use-fit-view";
import { useHostMessages } from "./app/_use-host-messages";
import { useInnerState } from "./app/_use-inner-state";
import { useNodeContextHandlers } from "./app/_on-node-context";
import { useNodeDrag } from "./app/_on-node-drag";
import { useUndoRedo } from "./app/_use-undo-redo";
import type { AppCtx } from "./app/_ctx";
import { EdgeActionsCtx } from "../substrate-r/edge-actions-ctx";

function Inner() {
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const dimmed = useDimmed();
  const s = useInnerState();
  const rf = useReactFlow();
  const [guides, setGuides] = useState<{ vx: number | null; hy: number | null }>({ vx: null, hy: null });

  const rebuildFlow = useCallback(() => {
    if (!s.lastSpec.current) return;
    const flow = specToFlow(s.lastSpec.current, viewerState.folds, viewerState);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [s.lastSpec]);

  const ctx: AppCtx = useMemo(() => ({
    setNodes, setEdges,
    lastSpec: s.lastSpec, reconnectOk: s.reconnectOk, paneRef: s.paneRef,
    flashIdsRef: s.flashIdsRef, flashTimerRef: s.flashTimerRef,
    rebuildFlow, rf,
  }), [rebuildFlow, rf, s.flashIdsRef, s.flashTimerRef, s.lastSpec, s.paneRef, s.reconnectOk]);

  useUndoRedo(ctx, true);
  useFitViewHotkeys(rf);
  useHostMessages(ctx);

  const onMoveEnd = useCallback((_: unknown, vp: Viewport) => {
    patchViewerState((v) => { v.camera = { x: vp.x, y: vp.y, zoom: vp.zoom }; });
    scheduleViewSave();
  }, []);
  const onNodesChange = useCallback(
    (c: NodeChange[]) => setNodes((ns) => applyNodeChanges(c, ns)), []);
  const onEdgesChange = useCallback(
    (c: EdgeChange[]) => setEdges((es) => applyEdgeChanges(c, es)), []);
  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: RFNode[] }) => {
    const ids = sel.map((n) => n.id);
    const prev = viewerState.lastSelectionIds ?? [];
    if (prev.length === ids.length && prev.every((v, i) => v === ids[i])) return;
    patchViewerState((v) => { v.lastSelectionIds = ids.length > 0 ? ids : undefined; });
    scheduleViewSave();
  }, []);

  const edgeH = useEdgeHandlers(ctx);
  const delH = useDeleteHandlers(ctx);
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key !== "Backspace" && ev.key !== "Delete") return;
      const target = ev.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const selectedFolds = nodes.filter((n) => n.type === "fold" && n.selected);
      if (selectedFolds.length === 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      delH.onNodesDelete(selectedFolds);
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true } as EventListenerOptions);
  }, [nodes, delH]);
  const ddH = useDragDrop(ctx);
  const dragH = useNodeDrag(ctx, guides, setGuides);
  const ctxH = useNodeContextHandlers(ctx);

  const styled = decorate(nodes, edges, dimmed);
  const edgeActions = useMemo(() => ({ setEdgeLane: edgeH.setEdgeLane }), [edgeH.setEdgeLane]);

  return (
    <EdgeActionsCtx.Provider value={edgeActions}>
    <AppView
      paneRef={s.paneRef}
      styledNodes={styled.nodes} styledEdges={styled.edges}
      guides={guides} edgeMenu={edgeH.edgeMenu}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      onMoveEnd={onMoveEnd} onSelectionChange={onSelectionChange}
      onNodeDoubleClick={ctxH.onNodeDoubleClick}
      onNodeContextMenu={ctxH.onNodeContextMenu}
      onSelectionContextMenu={ctxH.onSelectionContextMenu}
      onNodeDrag={dragH.onNodeDrag} onNodeDragStop={dragH.onNodeDragStop}
      onNodesDelete={delH.onNodesDelete} onEdgesDelete={delH.onEdgesDelete}
      onConnect={edgeH.onConnect} isValidConnection={edgeH.isValidConnection}
      onReconnect={edgeH.onReconnect}
      onReconnectStart={edgeH.onReconnectStart} onReconnectEnd={edgeH.onReconnectEnd}
      onEdgeContextMenu={edgeH.onEdgeContextMenu}
      closeEdgeMenu={edgeH.closeEdgeMenu} setEdgeKind={edgeH.setEdgeKind}
      onDragOver={ddH.onDragOver} onDrop={ddH.onDrop}
    />
    </EdgeActionsCtx.Provider>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <SaveLifecycle />
      <Inner />
      <RunButton />
<TimelinePanel />
    </ReactFlowProvider>
  );
}
