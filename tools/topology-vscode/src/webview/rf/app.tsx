import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  SelectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeChange,
  type EdgeChange,
  type Viewport,
} from "reactflow";
import { NODE_TYPES, parseSpec, type EdgeKind, type Spec } from "../../schema";
import { IDENT_RE } from "../rename-core";
import { applyDelete } from "../delete-core";
import { createFold, toggleFold } from "../fold-core";
import { NodePalette, PALETTE_DATA_TYPE } from "./NodePalette";
import { CompareToolbar, type CompareMode } from "./CompareToolbar";
import { isPlaying as isRunnerPlaying, load as loadRunner, reset as resetRunner } from "../../sim/runner";
import { MOTION_TYPES } from "../../sim/handlers";
import { beginRenameNodeId, setRenameRerender } from "../rename";
import { beginEditSublabel, setSublabelRerender } from "../sublabel";
import { flushViewSave, markViewSynced, scheduleSave, scheduleViewSave, vscode } from "../save";
import { refreshViewsPanel } from "../views";
import { refreshTimelinePanel } from "../timeline";
import {
  canRedoViewer,
  canUndoViewer,
  clearSpecHistory,
  clearViewerHistory,
  mutateBoth,
  mutateSpec,
  mutateViewer,
  redoSpec,
  redoViewer,
  setSpec,
  setViewerState,
  spec,
  undoSpec,
  undoViewer,
  viewerState,
} from "../state";
import {
  isLegacyCamera,
  parseViewerState,
  serializeViewerState,
  type ViewerState,
} from "../viewerState";
import { specToFlow } from "./adapter";
import { decorateForCompare, decorateForOnion } from "./diff-decorate";
import { AnimatedEdge } from "./AnimatedEdge";
import { AnimatedNode } from "./AnimatedNode";
import { FoldNode } from "./FoldNode";
import { NoteNode } from "./NoteNode";
import { MarkerDefs } from "./MarkerDefs";
import { LegendPanel } from "./LegendPanel";
import { notifyPanStart, register } from "./bridge";
import { boxToViewport, viewportToBox } from "./camera";
import { parseHostToWebview } from "../../messages";

const EDGE_TYPES = { animated: AnimatedEdge };
const RF_NODE_TYPES = { animated: AnimatedNode, fold: FoldNode, note: NoteNode };

// Snap-to-grid step matches the Background `gap={24}` so node positions
// land on the visible dots. Alignment-guide tolerance is in flow units;
// 4 covers off-grid drag noise without firing on every near-miss.
const GRID = 24;
const ALIGN_TOL = 4;

const EDGE_KIND_OPTIONS: EdgeKind[] = [
  "chain", "signal", "feedback-ack", "release", "streak",
  "pointer", "and-out", "edge-connection", "inhibit-in", "any",
];

function Inner() {
  const [nodes, setNodes] = useState<RFNode[]>([]);
  const [edges, setEdges] = useState<RFEdge[]>([]);
  const [dimmed, setDimmed] = useState<Set<string> | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<{ x: number; y: number; edgeId: string } | null>(null);
  // Comparison pane state. Held in memory only — never written through
  // save.ts, never sent back as {type:"save"}. The Tier 2 invariant test
  // (step 7) pins this contract down.
  const [comparisonSpec, setComparisonSpec] = useState<Spec | null>(null);
  const [comparisonLabel, setComparisonLabel] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("off");
  const [compareError, setCompareError] = useState<string | null>(null);
  // Mirror of compareMode for gesture handlers — they read it to short-
  // circuit when the comparison side is showing (read-only). Kept as a ref
  // so we don't have to re-create every useCallback when the mode flips.
  const compareModeRef = useRef<CompareMode>("off");
  useEffect(() => { compareModeRef.current = compareMode; }, [compareMode]);
  const isReadOnlyView = () => compareModeRef.current === "A-other";
  // Spacebar held → swap z-order of ghost vs live in onion mode.
  const [ghostFront, setGhostFront] = useState(false);
  useEffect(() => {
    if (compareMode !== "B-onion") return;
    const isSpace = (e: KeyboardEvent) => e.code === "Space" || e.key === " ";
    const isTextTarget = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const down = (e: KeyboardEvent) => {
      if (!isSpace(e) || e.repeat || isTextTarget(e.target)) return;
      e.preventDefault();
      setGhostFront(true);
    };
    const up = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      setGhostFront(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      setGhostFront(false);
    };
  }, [compareMode]);
  const selectedRef = useRef<Set<string>>(new Set());
  const paneRef = useRef<HTMLDivElement | null>(null);
  const lastSpec = useRef<Spec | null>(null);
  const reconnectOk = useRef<boolean>(false);
  const rf = useReactFlow();
  // Alignment guides during drag. Coordinates are flow-space; the rendered
  // overlay applies the live RF viewport transform to position them on
  // screen. Cleared on drag stop and on selection drag (multi-node moves
  // would need per-node guides, which is more than this MVP warrants).
  const [guides, setGuides] = useState<{ vx: number | null; hy: number | null }>({ vx: null, hy: null });

  // Undo/redo. Two scoped stacks (spec, viewer) live in state.ts; this
  // handler routes Cmd/Ctrl-Z and Cmd/Ctrl-Shift-Z (or Ctrl-Y) to whichever
  // stack matches the surface the user last interacted with. Surface is
  // tagged with `data-undo-scope="viewer"` on the views and timeline
  // panels; everything else (the main RF pane) falls through to spec.
  // Skipped while a text input is focused (browser's native undo wins) and
  // while the comparison pane is read-only.
  const lastScopeRef = useRef<"spec" | "viewer">("spec");
  // Brief diff-added flash on items that re-appear after an undo/redo.
  // Phase-8.md asks for both diff-added and diff-removed; for MVP we tag
  // re-appearing items only — items removed by the undo no longer render,
  // so there's nothing to decorate without a ghost-rendering pass.
  const flashIdsRef = useRef<Set<string>>(new Set());
  const flashTimerRef = useRef<number | null>(null);
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const scoped = t?.closest?.<HTMLElement>("[data-undo-scope]");
      lastScopeRef.current = (scoped?.dataset.undoScope as "spec" | "viewer") ?? "spec";
    };
    const isTextTarget = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    const flash = (ids: Set<string>) => {
      if (ids.size === 0) return;
      flashIdsRef.current = ids;
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => {
        flashIdsRef.current = new Set();
        flashTimerRef.current = null;
        if (lastSpec.current) {
          const f = specToFlow(lastSpec.current, viewerState.folds);
          setNodes(f.nodes);
          setEdges(f.edges);
        }
      }, 1500);
    };
    const decorate = (flow: ReturnType<typeof specToFlow>, ids: Set<string>) => {
      if (ids.size === 0) return flow;
      const tag = (cn: string | undefined) =>
        [cn, "diff-added"].filter(Boolean).join(" ");
      flow.nodes = flow.nodes.map((n) =>
        ids.has(n.id) ? { ...n, className: tag(n.className) } : n,
      );
      flow.edges = flow.edges.map((e) =>
        ids.has(e.id) ? { ...e, className: tag(e.className) } : e,
      );
      return flow;
    };
    const rebuildWithFlash = (flashSet: Set<string>) => {
      if (!lastSpec.current) return;
      const flow = specToFlow(lastSpec.current, viewerState.folds);
      const decorated = decorate(flow, flashSet);
      setNodes(decorated.nodes);
      setEdges(decorated.edges);
      flash(flashSet);
    };
    const idsOf = (s: Spec | null): Set<string> => {
      const out = new Set<string>();
      if (!s) return out;
      for (const n of s.nodes) out.add(n.id);
      for (const e of s.edges) out.add(e.id);
      return out;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      const isUndo = k === "z" && !e.shiftKey;
      const isRedo = (k === "z" && e.shiftKey) || k === "y";
      if (!isUndo && !isRedo) return;
      if (isTextTarget(e.target)) return;
      if (compareModeRef.current === "A-other") return;
      e.preventDefault();
      if (lastScopeRef.current === "viewer") {
        const beforeFolds = new Set((viewerState.folds ?? []).map((f) => f.id));
        const next = isUndo ? undoViewer() : redoViewer();
        if (!next) return;
        const afterFolds = new Set((next.folds ?? []).map((f) => f.id));
        const reappeared = new Set<string>();
        for (const id of afterFolds) if (!beforeFolds.has(id)) reappeared.add(id);
        rebuildWithFlash(reappeared);
        refreshViewsPanel();
        refreshTimelinePanel();
        scheduleViewSave();
      } else {
        const before = idsOf(lastSpec.current);
        const next = isUndo ? undoSpec() : redoSpec();
        if (!next) return;
        lastSpec.current = next;
        const after = idsOf(next);
        const reappeared = new Set<string>();
        for (const id of after) if (!before.has(id)) reappeared.add(id);
        rebuildWithFlash(reappeared);
        scheduleSave();
      }
    };
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("keydown", onKey);
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

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
      fitNodes: (ids) => {
        if (ids.length === 0) return;
        const set = new Set(ids);
        const nodes = rf.getNodes().filter((n) => set.has(n.id));
        if (nodes.length === 0) return;
        rf.fitView({ nodes, padding: 0.4, duration: 250, maxZoom: 1.2 });
      },
    });
    const rerenderFromSpec = () => {
      if (!lastSpec.current) return;
      const flow = specToFlow(lastSpec.current, viewerState.folds);
      setNodes(flow.nodes);
      setEdges(flow.edges);
    };
    setRenameRerender(rerenderFromSpec);
    setSublabelRerender(rerenderFromSpec);
  }, [rf]);

  useEffect(() => {
    const handler = (e: MessageEvent<unknown>) => {
      const msg = parseHostToWebview(e.data);
      if (!msg) return;
      if (msg.type === "load") {
        try {
          const next: Spec = parseSpec(JSON.parse(msg.text));
          setSpec(next);
          // Fresh load drops history — undoing into a previous file's spec
          // would be incoherent (ids may not even exist there).
          clearSpecHistory();
          lastSpec.current = next;
          loadRunner(next);
          resetRunner();
          const flow = specToFlow(next, viewerState.folds);
          // Reconcile the persisted selection against the current node set:
          // ids no longer present (after a delete in another session) are
          // dropped from selectedRef, not kept as ghosts.
          const presentIds = new Set(flow.nodes.map((n) => n.id));
          const sel = new Set(
            (viewerState.lastSelectionIds ?? []).filter((id) => presentIds.has(id))
          );
          if (sel.size > 0) {
            flow.nodes = flow.nodes.map((n) =>
              sel.has(n.id) ? { ...n, selected: true } : n
            );
          }
          selectedRef.current = sel;
          setNodes(flow.nodes);
          setEdges(flow.edges);
        } catch (err) {
          console.error("invalid topology.json", err);
        }
      } else if (msg.type === "compare-load") {
        try {
          const next: Spec = parseSpec(JSON.parse(msg.text));
          setComparisonSpec(next);
          setComparisonLabel(msg.label);
          setCompareError(null);
          setCompareMode("A-live");
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setCompareError(`could not parse ${msg.label}: ${message}`);
        }
      } else if (msg.type === "compare-error") {
        setCompareError(msg.message);
      } else if (msg.type === "view-load") {
        const next: ViewerState = parseViewerState(msg.text);
        setViewerState(next);
        // Same reasoning as clearSpecHistory on spec load: a fresh sidecar
        // makes prior viewer history incoherent (folds/views/bookmarks may
        // not exist there).
        clearViewerHistory();
        markViewSynced(msg.text ?? serializeViewerState(next));
        // If the spec already loaded *and* the sidecar has folds, rebuild
        // the flow now so the folds (which live on viewerState, not the
        // spec) actually appear. Skip when no folds — the spec-load path
        // already rendered correctly and a second pass would just churn
        // RF re-renders.
        if (lastSpec.current && next.folds && next.folds.length > 0) {
          const flow = specToFlow(lastSpec.current, next.folds);
          setNodes(flow.nodes);
          setEdges(flow.edges);
        }
        // Always reconcile selection on view-load — including the empty case,
        // so a sidecar without saved selection clears any stale `selected`
        // flags from a prior render. If nodes haven't arrived yet, just seed
        // selectedRef; the load handler will filter it against the spec.
        const savedSel = new Set(next.lastSelectionIds ?? []);
        setNodes((ns) => {
          if (ns.length === 0) {
            selectedRef.current = savedSel;
            return ns;
          }
          const present = new Set(ns.map((n) => n.id));
          const reconciled = new Set([...savedSel].filter((id) => present.has(id)));
          selectedRef.current = reconciled;
          return ns.map((n) => {
            const want = reconciled.has(n.id);
            return n.selected === want ? n : { ...n, selected: want };
          });
        });
        const c = next.camera;
        if (c && !isLegacyCamera(c)) {
          rf.setViewport({ x: c.x, y: c.y, zoom: c.zoom });
        } else if (c) {
          // Legacy SVG viewBox sidecar — convert with the current pane size,
          // then rewrite `next.camera` in canonical form so the next save
          // persists the migrated shape and we never re-read the legacy box.
          const pane = paneRef.current;
          if (pane) {
            const { width, height } = pane.getBoundingClientRect();
            const vp = boxToViewport(c, width, height);
            rf.setViewport(vp);
            next.camera = { x: vp.x, y: vp.y, zoom: vp.zoom };
            scheduleViewSave();
          }
        }
      }
    };
    window.addEventListener("message", handler);
    vscode.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, [rf]);

  const persistViewport = useCallback((vp: Viewport) => {
    viewerState.camera = { x: vp.x, y: vp.y, zoom: vp.zoom };
    scheduleViewSave();
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
      const ids = sel.map((n) => n.id);
      selectedRef.current = new Set(ids);
      const prev = viewerState.lastSelectionIds ?? [];
      if (prev.length === ids.length && prev.every((v, i) => v === ids[i])) return;
      viewerState.lastSelectionIds = ids.length > 0 ? ids : undefined;
      scheduleViewSave();
    },
    [scheduleViewSave]
  );
  const rebuildFlow = useCallback(() => {
    if (!lastSpec.current) return;
    const flow = specToFlow(lastSpec.current, viewerState.folds);
    setNodes(flow.nodes);
    setEdges(flow.edges);
  }, []);

  const handleDelete = useCallback((nodeIds: string[], edgeIds: string[]) => {
    if (isReadOnlyView()) return;
    if (!lastSpec.current) return;
    if (nodeIds.length === 0 && edgeIds.length === 0) return;
    // mutateBoth: applyDelete patches both spec and viewerState (orphan
    // cleanup in views/folds/lastSelectionIds). Cmd-Z must restore both
    // surfaces in one step.
    let next = lastSpec.current;
    mutateBoth((s, v) => { applyDelete(s, v, nodeIds, edgeIds); next = s; });
    lastSpec.current = next;
    // applyDelete cascades (e.g. drops edges incident to deleted nodes) —
    // RF only removed the items its own change set named, so rebuild from
    // the post-delete spec to flush stale visuals before the host save
    // round-trip.
    rebuildFlow();
    scheduleSave();
    scheduleViewSave();
  }, [rebuildFlow, scheduleViewSave]);

  const onNodesDelete = useCallback((deleted: RFNode[]) => {
    // Folds live in viewerState, not the spec — split them out so applyDelete
    // doesn't try to remove them from spec.nodes (where they don't exist).
    const foldIds = deleted.filter((n) => n.type === "fold").map((n) => n.id);
    const specIds = deleted.filter((n) => n.type !== "fold").map((n) => n.id);
    if (foldIds.length > 0 && viewerState.folds) {
      mutateViewer((s) => {
        s.folds = (s.folds ?? []).filter((f) => !foldIds.includes(f.id));
      });
      console.info(`[fold] removed: ${foldIds.join(", ")}`);
      flushViewSave();
      // If only folds were deleted, rebuild the flow now (otherwise the spec
      // delete path below will rebuild via specToFlow).
      if (specIds.length === 0) {
        rebuildFlow();
        return;
      }
    }
    handleDelete(specIds, []);
  }, [handleDelete, rebuildFlow, flushViewSave]);
  const onEdgesDelete = useCallback((deleted: RFEdge[]) => {
    handleDelete([], deleted.map((e) => e.id));
  }, [handleDelete]);

  const onConnect = useCallback((conn: Connection) => {
    if (isReadOnlyView()) return;
    if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
    if (!lastSpec.current) return;
    const srcNode = spec.nodes.find((n) => n.id === conn.source);
    const dstNode = spec.nodes.find((n) => n.id === conn.target);
    if (!srcNode || !dstNode) return;
    const srcDef = NODE_TYPES[srcNode.type];
    const dstDef = NODE_TYPES[dstNode.type];
    const srcPort = srcDef?.outputs.find((p) => p.name === conn.sourceHandle);
    const dstPort = dstDef?.inputs.find((p) => p.name === conn.targetHandle);
    if (!srcPort || !dstPort) return;
    // Input ports are 1-to-1: each target.handle is a single chan field on
    // the runtime node struct, so two senders into the same port can't be
    // wired. Reject before the edge is added rather than letting topogen
    // emit broken Go. (Outputs are allowed to fan out — e.g.
    // ChainInhibitor.inhibitOut → multiple inhibit gates.)
    const portTaken = spec.edges.some(
      (e) => e.target === conn.target && e.targetHandle === conn.targetHandle,
    );
    if (portTaken) {
      console.warn(
        `wirefold: target port ${conn.target}.${conn.targetHandle} is already wired; refusing duplicate edge`,
      );
      return;
    }
    // Channel-type inference: edge kind is the source port's kind. If the
    // target port disagrees, fall back to "any" so validatePorts won't reject
    // the new edge on reload (kind is informational; the handles carry the
    // actual port identity).
    const kind: EdgeKind = srcPort.kind === dstPort.kind ? srcPort.kind : "any";
    const baseId = `${conn.source}.${conn.sourceHandle}->${conn.target}.${conn.targetHandle}`;
    let id = baseId;
    let n = 2;
    while (spec.edges.some((e) => e.id === id)) id = `${baseId}#${n++}`;
    // topogen uses edge.label verbatim as the channel variable name and
    // requires a valid Go identifier (see cmd/topogen/main.go identRE).
    // Synthesize one from source/target ids; dedupe against existing
    // labels with a numeric suffix. Users can rename later.
    const cap = (s: string) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));
    const baseLabel = `${conn.source}${cap(conn.sourceHandle)}To${cap(conn.target)}${cap(conn.targetHandle)}`
      .replace(/[^A-Za-z0-9_]/g, "_")
      .replace(/^([0-9])/, "_$1");
    let label = baseLabel;
    let m = 2;
    while (spec.edges.some((e) => e.label === label)) label = `${baseLabel}_${m++}`;
    const next = mutateSpec((s) => {
      s.edges.push({
        id,
        source: conn.source!,
        sourceHandle: conn.sourceHandle!,
        target: conn.target!,
        targetHandle: conn.targetHandle!,
        kind,
        label,
      });
    });
    lastSpec.current = next;
    const flow = specToFlow(next, viewerState.folds);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    scheduleSave();
  }, []);

  const onReconnectStart = useCallback(() => {
    reconnectOk.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge: RFEdge, conn: Connection) => {
    if (isReadOnlyView()) return;
    if (!conn.source || !conn.target || !conn.sourceHandle || !conn.targetHandle) return;
    if (!lastSpec.current) return;
    const specEdge = spec.edges.find((e) => e.id === oldEdge.id);
    if (!specEdge) return;
    const srcNode = spec.nodes.find((n) => n.id === conn.source);
    const dstNode = spec.nodes.find((n) => n.id === conn.target);
    if (!srcNode || !dstNode) return;
    const srcDef = NODE_TYPES[srcNode.type];
    const dstDef = NODE_TYPES[dstNode.type];
    const srcPort = srcDef?.outputs.find((p) => p.name === conn.sourceHandle);
    const dstPort = dstDef?.inputs.find((p) => p.name === conn.targetHandle);
    if (!srcPort || !dstPort) return;
    // Same 1-to-1 input invariant as onConnect — but ignore the edge being
    // rerouted itself (otherwise re-dropping on its existing target would
    // self-reject).
    const portTaken = spec.edges.some(
      (e) => e.id !== oldEdge.id &&
        e.target === conn.target &&
        e.targetHandle === conn.targetHandle,
    );
    if (portTaken) {
      console.warn(
        `wirefold: target port ${conn.target}.${conn.targetHandle} is already wired; refusing reroute`,
      );
      return;
    }
    const newKind: EdgeKind = srcPort.kind === dstPort.kind ? srcPort.kind : "any";
    const next = mutateSpec((s) => {
      const e = s.edges.find((x) => x.id === oldEdge.id);
      if (!e) return;
      e.source = conn.source!;
      e.sourceHandle = conn.sourceHandle!;
      e.target = conn.target!;
      e.targetHandle = conn.targetHandle!;
      e.kind = newKind;
    });
    reconnectOk.current = true;
    lastSpec.current = next;
    const flow = specToFlow(next, viewerState.folds);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    scheduleSave();
  }, []);

  const onReconnectEnd = useCallback(() => {
    // Drop-in-empty-space leaves the edge untouched (reroute, not delete).
    reconnectOk.current = false;
  }, []);

  const onEdgeContextMenu = useCallback((ev: React.MouseEvent, edge: RFEdge) => {
    ev.preventDefault();
    setEdgeMenu({ x: ev.clientX, y: ev.clientY, edgeId: edge.id });
  }, []);

  const closeEdgeMenu = useCallback(() => setEdgeMenu(null), []);

  const setEdgeKind = useCallback((edgeId: string, kind: EdgeKind) => {
    if (isReadOnlyView()) return;
    if (!lastSpec.current) return;
    if (!spec.edges.some((e) => e.id === edgeId)) return;
    const next = mutateSpec((s) => {
      const e = s.edges.find((x) => x.id === edgeId);
      if (e) e.kind = kind;
    });
    lastSpec.current = next;
    const flow = specToFlow(next, viewerState.folds);
    setNodes(flow.nodes);
    setEdges(flow.edges);
    scheduleSave();
    setEdgeMenu(null);
  }, []);

  const closeCompare = useCallback(() => {
    setComparisonSpec(null);
    setComparisonLabel(null);
    setCompareMode("off");
    setCompareError(null);
  }, []);

  const onDragOver = useCallback((ev: React.DragEvent) => {
    if (!Array.from(ev.dataTransfer.types).includes(PALETTE_DATA_TYPE)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (ev: React.DragEvent) => {
      if (isReadOnlyView()) return;
      const type = ev.dataTransfer.getData(PALETTE_DATA_TYPE);
      if (!type || !NODE_TYPES[type]) return;
      ev.preventDefault();
      if (!lastSpec.current) return;
      const pos = rf.screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      // Mint a unique id from the type. Lowercase first char so the id is a
      // valid Go identifier the first time topogen consumes it; numeric
      // suffix dedupes against existing ids.
      const base = type.charAt(0).toLowerCase() + type.slice(1);
      let n = 0;
      let id = `${base}${n}`;
      while (spec.nodes.some((nd) => nd.id === id)) {
        n += 1;
        id = `${base}${n}`;
      }
      if (!IDENT_RE.test(id)) return;
      const next = mutateSpec((s) => {
        s.nodes.push({ id, type, x: pos.x, y: pos.y });
      });
      lastSpec.current = next;
      const flow = specToFlow(next, viewerState.folds);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      scheduleSave();
    },
    [rf]
  );

  const onNodeDoubleClick = useCallback(
    (ev: React.MouseEvent, node: RFNode) => {
      if (isReadOnlyView()) return;
      // Fold placeholder → toggle collapsed state. Expanded folds aren't
      // selectable, so dbl-click never fires on them; collapsing again uses
      // the right-click "fold selection" path on regular nodes.
      if (node.type === "fold") {
        if (toggleFold(viewerState, node.id)) {
          const f = viewerState.folds?.find((x) => x.id === node.id);
          console.info(`[fold] toggled ${node.id} -> collapsed=${f?.collapsed}`);
          rebuildFlow();
          flushViewSave();
        }
        return;
      }
      // Anchor the input over the node wrapper, not whichever inner element
      // happened to receive the click (label / state-text divs are smaller
      // than the node and would offset the input).
      const t = ev.target as HTMLElement | null;
      // Sublabel area gets its own editor; falls through to id rename
      // otherwise.
      const sublabelEl = t?.closest<HTMLElement>(".node-sublabel");
      if (sublabelEl) {
        beginEditSublabel(node.id, sublabelEl);
        return;
      }
      const wrapper =
        t?.closest<HTMLElement>(".react-flow__node") ??
        (ev.currentTarget as HTMLElement);
      // Prefer the label element so the input sits exactly where the id text
      // is drawn — content can be vertically offset when a node also renders
      // state-text lines.
      const label = wrapper.querySelector<HTMLElement>(".node-label");
      beginRenameNodeId(node.id, label);
    },
    [rebuildFlow, flushViewSave]
  );

  const onNodeDrag = useCallback(
    (_ev: React.MouseEvent, node: RFNode) => {
      if (isReadOnlyView()) return;
      if (node.type === "fold") {
        // Fold placeholder dimensions vary; skipping keeps the matcher
        // honest and avoids guides that snap to a moving target.
        if (guides.vx !== null || guides.hy !== null) setGuides({ vx: null, hy: null });
        return;
      }
      const def = NODE_TYPES[node.type as string] ?? NODE_TYPES.Generic;
      const cx = node.position.x + def.width / 2;
      const cy = node.position.y + def.height / 2;
      let vx: number | null = null;
      let hy: number | null = null;
      for (const other of rf.getNodes()) {
        if (other.id === node.id || other.type === "fold") continue;
        const odef = NODE_TYPES[other.type as string] ?? NODE_TYPES.Generic;
        const ocx = other.position.x + odef.width / 2;
        const ocy = other.position.y + odef.height / 2;
        if (vx === null && Math.abs(ocx - cx) < ALIGN_TOL) vx = ocx;
        if (hy === null && Math.abs(ocy - cy) < ALIGN_TOL) hy = ocy;
        if (vx !== null && hy !== null) break;
      }
      if (vx !== guides.vx || hy !== guides.hy) setGuides({ vx, hy });
    },
    [rf, guides.vx, guides.hy],
  );

  const onNodeDragStop = useCallback(
    (_ev: React.MouseEvent, node: RFNode) => {
      setGuides({ vx: null, hy: null });
      if (isReadOnlyView()) return;
      if (node.type === "fold") {
        // Persist fold-placeholder drags back into viewerState.folds so the
        // position survives reload (folds live in the sidecar).
        const f = viewerState.folds?.find((x) => x.id === node.id);
        if (!f) return;
        f.position = [node.position.x, node.position.y];
        scheduleViewSave();
        return;
      }
      // Regular node: persist x/y back to the spec, otherwise the next disk
      // reload snaps the node back to its old position.
      const sn = spec.nodes.find((n) => n.id === node.id);
      if (!sn) return;
      const dx = node.position.x - sn.x;
      const dy = node.position.y - sn.y;
      if (dx === 0 && dy === 0) return;
      // Phase 6 Chunk B record-mode-lite: paused drag on a motion-bearing
      // node rewrites the per-phase slide rule (props.slidePx/slideDy) so
      // the next firing lands at the dropped position. base (x, y) is the
      // origin the slide accumulates from, not the rendered position, so
      // editing it would shift the entire trajectory — not what the user
      // means by "drop here." See docs/planning/visual-editor/phase-6.md.
      if (MOTION_TYPES.has(sn.type) && !isRunnerPlaying()) {
        const next = mutateSpec((s) => {
          const target = s.nodes.find((n) => n.id === node.id);
          if (!target) return;
          const p = { ...(target.props ?? {}) };
          p.slidePx = Number(p.slidePx ?? 30) + dx;
          p.slideDy = Number(p.slideDy ?? 0) + dy;
          target.props = p;
        });
        lastSpec.current = next;
        // Spec base x/y didn't change, so RF must re-snap to the original
        // position — otherwise the dragged-to coordinate sticks visually
        // and compounds with the next state.dx tween.
        rebuildFlow();
        scheduleSave();
        return;
      }
      const next = mutateSpec((s) => {
        const target = s.nodes.find((n) => n.id === node.id);
        if (!target) return;
        target.x = node.position.x;
        target.y = node.position.y;
      });
      lastSpec.current = next;
      scheduleSave();
    },
    [rebuildFlow]
  );

  const foldCurrentSelection = useCallback(() => {
    if (isReadOnlyView()) return;
    const sel = selectedRef.current;
    const memberIds = Array.from(sel).filter((id) => spec.nodes.some((n) => n.id === id));
    if (memberIds.length < 2) {
      console.info(`[fold] need >=2 nodes selected to fold; have ${memberIds.length}`);
      return;
    }
    let cx = 0, cy = 0;
    for (const id of memberIds) {
      const n = spec.nodes.find((sn) => sn.id === id);
      if (n) { cx += n.x; cy += n.y; }
    }
    cx = cx / memberIds.length;
    cy = cy / memberIds.length;
    const id = mutateViewer((s) => createFold(s, memberIds, [cx, cy]));
    if (!id) {
      console.info(
        `[fold] createFold rejected (members may already be inside another fold): ${memberIds.join(", ")}`,
      );
      return;
    }
    console.info(`[fold] created ${id} with ${memberIds.length} members: ${memberIds.join(", ")}`);
    rebuildFlow();
    flushViewSave();
  }, [rebuildFlow, flushViewSave]);

  const onSelectionContextMenu = useCallback(
    (ev: React.MouseEvent, _selNodes: RFNode[]) => {
      ev.preventDefault();
      foldCurrentSelection();
    },
    [foldCurrentSelection]
  );

  const onNodeContextMenu = useCallback(
    (ev: React.MouseEvent, node: RFNode) => {
      ev.preventDefault();
      if (node.type === "fold") {
        console.info("[fold] right-click on a placeholder is a no-op; double-click to expand");
        return;
      }
      const sel = selectedRef.current;
      if (!sel.has(node.id)) {
        // Single-node right-click on an unselected node: silently add it
        // and fold — but only if there's already an existing selection
        // (otherwise this is a stray right-click). For now: prompt.
        console.info(
          `[fold] right-clicked node "${node.id}" is not in the selection (${sel.size} selected); shift-click to add it before folding`,
        );
        return;
      }
      foldCurrentSelection();
    },
    [foldCurrentSelection]
  );

  // Compose dim + diff decoration. When compareMode is "off", the live
  // nodes/edges state drives RF directly. In A-live we keep the live state
  // and layer diff classes (and ghost-injected items) on top. In A-other we
  // re-derive nodes/edges from the comparison spec and decorate against
  // live; gesture handlers early-return so no save fires.
  let baseNodes = nodes;
  let baseEdges = edges;
  if (comparisonSpec && (compareMode === "A-live" || compareMode === "A-other")) {
    const visible = compareMode === "A-live" ? lastSpec.current : comparisonSpec;
    const other = compareMode === "A-live" ? comparisonSpec : lastSpec.current;
    if (visible && other) {
      const decorated = decorateForCompare(visible, other, viewerState.folds ?? []);
      baseNodes = decorated.nodes;
      baseEdges = decorated.edges;
    }
  } else if (comparisonSpec && compareMode === "B-onion" && lastSpec.current) {
    const decorated = decorateForOnion(lastSpec.current, comparisonSpec, viewerState.folds ?? []);
    baseNodes = decorated.nodes;
    baseEdges = decorated.edges;
  }
  const styledNodes = dimmed
    ? baseNodes.map((n) => {
        const dimClass = dimmed.has(n.id) ? "" : "dim";
        if (!dimClass && !n.className) return n;
        const merged = [n.className, dimClass].filter(Boolean).join(" ");
        return { ...n, className: merged };
      })
    : baseNodes;
  const styledEdges = dimmed
    ? baseEdges.map((e) => {
        const dimClass = dimmed.has(e.source) && dimmed.has(e.target) ? "" : "dim";
        if (!dimClass && !e.className) return e;
        const merged = [e.className, dimClass].filter(Boolean).join(" ");
        return { ...e, className: merged };
      })
    : baseEdges;

  return (
    <div
      ref={paneRef}
      className={ghostFront ? "ghost-front" : undefined}
      style={{ position: "absolute", inset: 0 }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onSelectionChange={onSelectionChange}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeContextMenu={onNodeContextMenu}
        onSelectionContextMenu={onSelectionContextMenu}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        snapToGrid={true}
        snapGrid={[GRID, GRID]}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onEdgeUpdate={onReconnect}
        onEdgeUpdateStart={onReconnectStart}
        onEdgeUpdateEnd={onReconnectEnd}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={closeEdgeMenu}
        minZoom={0.1}
        maxZoom={4}
        zoomOnDoubleClick={false}
        fitView
        deleteKeyCode={["Delete", "Backspace"]}
        nodesConnectable={true}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={true}
        panOnDrag={[1]}
        panOnScroll={true}
        edgeTypes={EDGE_TYPES}
        nodeTypes={RF_NODE_TYPES}
      >
        <Background gap={24} />
        <Controls />
      </ReactFlow>
      {(guides.vx !== null || guides.hy !== null) && (() => {
        const vp = rf.getViewport();
        return (
          <>
            {guides.vx !== null && (
              <div
                className="align-guide align-guide-v"
                style={{ left: guides.vx * vp.zoom + vp.x }}
              />
            )}
            {guides.hy !== null && (
              <div
                className="align-guide align-guide-h"
                style={{ top: guides.hy * vp.zoom + vp.y }}
              />
            )}
          </>
        );
      })()}
      <MarkerDefs />
      <LegendPanel rows={spec.legend ?? []} />
      <NodePalette />
      <CompareToolbar
        mode={compareMode}
        label={comparisonLabel}
        error={compareError}
        onSetMode={setCompareMode}
        onClose={closeCompare}
      />
      {edgeMenu && (
        <div
          className="edge-context-menu"
          style={{ position: "absolute", left: edgeMenu.x, top: edgeMenu.y, zIndex: 10 }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="edge-context-menu-header">edge kind</div>
          {(() => {
            const currentKind = spec.edges.find((e) => e.id === edgeMenu.edgeId)?.kind;
            return EDGE_KIND_OPTIONS.map((k) => (
              <button
                key={k}
                type="button"
                className={
                  "edge-context-menu-item" + (k === currentKind ? " active" : "")
                }
                onClick={() => setEdgeKind(edgeMenu.edgeId, k)}
              >
                {k}
              </button>
            ));
          })()}
        </div>
      )}
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
