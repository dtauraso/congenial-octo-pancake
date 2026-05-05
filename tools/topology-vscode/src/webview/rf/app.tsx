import { useCallback, useMemo, useState } from "react";
import {
  ReactFlowProvider, applyEdgeChanges, applyNodeChanges, useReactFlow,
  type Edge as RFEdge, type EdgeChange, type Node as RFNode, type NodeChange, type Viewport,
} from "reactflow";
import { specToFlow } from "./adapter";
import { RunButton } from "../panels/RunButton";
import { SaveLifecycle } from "../SaveLifecycle";
import { TimelinePanel } from "../panels/TimelinePanel";
import { ViewsPanel } from "../panels/ViewsPanel";
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
import "./timeline-probe";
import type { AppCtx } from "./app/_ctx";

function Inner() {
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const dimmed = useDimmed();
  const s = useInnerState();
  const rf = useReactFlow();
  const [guides, setGuides] = useState<{ vx: number | null; hy: number | null }>({ vx: null, hy: null });

  const rebuildFlow = useCallback(() => {
    if (!s.lastSpec.current) return;
    const flow = specToFlow(s.lastSpec.current, viewerState.folds);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, [s.lastSpec]);

  const ctx: AppCtx = useMemo(() => ({
    setNodes, setEdges,
    lastSpec: s.lastSpec, reconnectOk: s.reconnectOk, paneRef: s.paneRef,
    flashIdsRef: s.flashIdsRef, flashTimerRef: s.flashTimerRef,
    compareModeRef: s.compareModeRef,
    isReadOnlyView: () => s.compareModeRef.current === "A-other",
    rebuildFlow, rf,
  }), [rebuildFlow, rf, s.compareModeRef, s.flashIdsRef, s.flashTimerRef, s.lastSpec, s.paneRef, s.reconnectOk]);

  useUndoRedo(ctx, s.compareMode !== "A-other");
  useFitViewHotkeys(rf);
  // Stable identity is load-bearing: useHostMessages' effect deps include
  // this object, and a fresh literal each render re-runs the effect, which
  // re-posts {type:"ready"} → host re-sends view-load → setViewport snaps
  // the camera back mid-pan.
  const compareSetters = useMemo(() => ({
    setComparisonSpec: s.setComparisonSpec,
    setComparisonLabel: s.setComparisonLabel,
    setCompareMode: s.setCompareMode,
    setCompareError: s.setCompareError,
  }), [s.setComparisonSpec, s.setComparisonLabel, s.setCompareMode, s.setCompareError]);
  useHostMessages(ctx, compareSetters);

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
  const ddH = useDragDrop(ctx);
  const dragH = useNodeDrag(ctx, guides, setGuides);
  const ctxH = useNodeContextHandlers(ctx);

  const closeCompare = useCallback(() => {
    s.setComparisonSpec(null); s.setComparisonLabel(null);
    s.setCompareMode("off"); s.setCompareError(null);
  }, [s]);

  const styled = decorate(nodes, edges, dimmed, s.comparisonSpec, s.compareMode, s.lastSpec.current);

  return (
    <AppView
      paneRef={s.paneRef} ghostFront={s.ghostFront}
      styledNodes={styled.nodes} styledEdges={styled.edges}
      guides={guides} edgeMenu={edgeH.edgeMenu}
      compareMode={s.compareMode} comparisonLabel={s.comparisonLabel} compareError={s.compareError}
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
      setCompareMode={s.setCompareMode} closeCompare={closeCompare}
      onDragOver={ddH.onDragOver} onDrop={ddH.onDrop}
    />
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <SaveLifecycle />
      <Inner />
      <RunButton />
      <ViewsPanel />
      <TimelinePanel />
    </ReactFlowProvider>
  );
}
