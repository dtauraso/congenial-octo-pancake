import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import {
  KIND_COLORS,
  NODE_TYPES,
  type Edge as SpecEdge,
  type EdgeKind,
  type Node as SpecNode,
  type Spec,
} from "../../schema";
import type { Fold } from "../viewerState";

// Fold-aware spec→flow conversion. Folds are viewer-only state; they never
// touch the spec (topogen ignores topology.view.json). Edges that cross a
// collapsed fold boundary are re-routed onto the fold placeholder *only in
// the flow*; the underlying spec edge keeps its original endpoints, so on
// expand the original wiring is reinstated without mutation. Documented
// here rather than in bridge.ts because the rerouting logic lives in this
// module — bridge.ts is renderer-glue and stays purely about camera/dim.

const COLLAPSED_FOLD_W = 140;
const COLLAPSED_FOLD_H = 60;
const EXPANDED_PADDING = 16;

function expandedBounds(fold: Fold, byId: Map<string, SpecNode>) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of fold.memberIds) {
    const n = byId.get(id);
    if (!n) continue;
    const def = NODE_TYPES[n.type];
    const w = def?.width ?? 110;
    const h = def?.height ?? 60;
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    if (n.x + w > maxX) maxX = n.x + w;
    if (n.y + h > maxY) maxY = n.y + h;
  }
  if (!Number.isFinite(minX)) {
    return { x: fold.position[0], y: fold.position[1], w: COLLAPSED_FOLD_W, h: COLLAPSED_FOLD_H };
  }
  return {
    x: minX - EXPANDED_PADDING,
    y: minY - EXPANDED_PADDING,
    w: (maxX - minX) + EXPANDED_PADDING * 2,
    h: (maxY - minY) + EXPANDED_PADDING * 2,
  };
}

export function specToFlow(
  spec: Spec,
  folds: Fold[] = [],
): { nodes: RFNode[]; edges: RFEdge[] } {
  // Phase 5.5: animation is driven by the simulator runner emitting
  // events for AnimatedNode/AnimatedEdge to subscribe to. The adapter
  // no longer pre-computes fireTimes / state segments / pulse offsets
  // from timing.steps[]; that field is parser-accepted no-op pending
  // full removal in Chunk D.

  // Map memberId → containing collapsed fold id. Nested folds are not
  // supported here; if a node appears in multiple collapsed folds, the first
  // wins (the plan flags nested folds as needing manual coordination).
  const collapsedFoldFor = new Map<string, string>();
  for (const f of folds) {
    if (!f.collapsed) continue;
    for (const m of f.memberIds) {
      if (!collapsedFoldFor.has(m)) collapsedFoldFor.set(m, f.id);
    }
  }

  const nodeById = new Map<string, SpecNode>();
  for (const n of spec.nodes) nodeById.set(n.id, n);

  const foldNodes: RFNode[] = folds.map((f) => {
    if (f.collapsed) {
      return {
        id: f.id,
        type: "fold",
        position: { x: f.position[0], y: f.position[1] },
        data: {
          label: f.label,
          collapsed: true,
          memberCount: f.memberIds.length,
          width: COLLAPSED_FOLD_W,
          height: COLLAPSED_FOLD_H,
        },
        // Z-order: collapsed placeholder is the only thing visible for its
        // members, so it should be a normal selectable/draggable node.
        zIndex: 0,
      };
    }
    const b = expandedBounds(f, nodeById);
    return {
      id: f.id,
      type: "fold",
      position: { x: b.x, y: b.y },
      data: {
        label: f.label,
        collapsed: false,
        memberCount: f.memberIds.length,
        width: b.w,
        height: b.h,
      },
      // Expanded folds render as a translucent rect *behind* their members.
      // We don't set zIndex: -1 — that drops the whole wrapper (label tab
      // included) below the canvas background. Array order is enough: fold
      // nodes are emitted first below, so RF stacks them under members.
      // Selectable so the dbl-click toggle (re-collapse) reaches the
      // wrapper; not draggable because the frame's position is recomputed
      // from member bounds on every render.
      draggable: false,
    };
  });

  const memberNodes: RFNode[] = spec.nodes
    .filter((n) => !collapsedFoldFor.has(n.id))
    .map((n) => {
    const def = NODE_TYPES[n.type];
    const width = def?.width ?? 110;
    const height = def?.height ?? 60;
    return {
      id: n.id,
      type: "animated",
      position: { x: n.x, y: n.y },
      data: {
        label: n.id,
        sublabel: n.sublabel,
        type: n.type,
        fill: def?.fill ?? "#ffffff",
        stroke: def?.stroke ?? "#888",
        shape: def?.shape ?? "rect",
        width,
        height,
        inputs: def?.inputs ?? [],
        outputs: def?.outputs ?? [],
        // Phase 6 Chunk A: round-trip node.state so initial dx/dy
        // (and any other handler-state seed) survives spec → flow →
        // spec. The runner overwrites world.state from initWorld; the
        // spec field is the seed, not the live value.
        state: n.state,
        props: n.props,
        spec: n.spec,
        notes: n.notes,
      },
    };
  });

  const edges: RFEdge[] = [];
  for (const e of spec.edges) {
    const srcFold = collapsedFoldFor.get(e.source);
    const dstFold = collapsedFoldFor.get(e.target);
    // Both endpoints inside the same collapsed fold → edge is internal,
    // skip rendering.
    if (srcFold && dstFold && srcFold === dstFold) continue;

    const source = srcFold ?? e.source;
    const target = dstFold ?? e.target;
    // When an endpoint is rerouted to a fold placeholder, the original
    // port handle no longer applies — the placeholder has no per-port
    // handles. Drop sourceHandle/targetHandle on rerouted endpoints so
    // RF falls back to the placeholder's default handles.
    const sourceHandle = srcFold ? undefined : e.sourceHandle;
    const targetHandle = dstFold ? undefined : e.targetHandle;
    edges.push({
      id: e.id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: "animated",
      // `label` is rendered as SVG <text> by AnimatedEdge so the
      // style-guide font-weight / fill / stroke="none" rules apply
      // (RF's default label renders via foreignObject, which the
      // guide's text exceptions don't reach). Carried in data only.
      style: { stroke: KIND_COLORS[e.kind] ?? "#888", strokeWidth: 1.5 },
      data: {
        kind: e.kind,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        route: e.route,
        lane: e.lane,
        arrowStyle: e.arrowStyle,
        valueLabel: e.valueLabel,
        label: e.label,
      },
    });
  }

  // spec.notes[] render as RF nodes of type "note" so they pan/zoom
  // with the canvas. Index-keyed ids (`__note-N`) keep ordering stable
  // across the round-trip; flowToSpec reads the same prefix back.
  const NOTE_DEFAULT_W = 160;
  const NOTE_DEFAULT_H = 60;
  const noteNodes: RFNode[] = (spec.notes ?? []).map((nt, i) => ({
    id: `__note-${i}`,
    type: "note",
    position: { x: nt.x, y: nt.y },
    data: {
      text: nt.text,
      width: nt.width ?? NOTE_DEFAULT_W,
      height: nt.height ?? NOTE_DEFAULT_H,
      hasWidth: nt.width !== undefined,
      hasHeight: nt.height !== undefined,
    },
    draggable: false,
    selectable: false,
  }));

  // Fold rectangles render *behind* the rest, so emit them first.
  return { nodes: [...foldNodes, ...memberNodes, ...noteNodes], edges };
}

// Reverse of specToFlow: reconstruct a Spec from React Flow's node/edge
// state. Used by the round-trip contract test — any field that specToFlow
// drops on the way out and flowToSpec can't recover on the way back will
// cause the round-trip to diverge from the source spec, which is the
// signal we want.
export function flowToSpec(nodes: RFNode[], edges: RFEdge[]): Spec {
  // Fold nodes are viewer-only; note nodes are spec.notes[] (handled
  // below). Both are filtered out before mapping the rest to spec.nodes.
  const specNodes: SpecNode[] = nodes
    .filter((n) => n.type !== "fold" && n.type !== "note")
    .map((n) => {
    const d = (n.data ?? {}) as {
      type?: string;
      sublabel?: string;
      state?: SpecNode["state"];
      props?: SpecNode["props"];
      spec?: SpecNode["spec"];
      notes?: SpecNode["notes"];
    };
    return {
      id: n.id,
      type: d.type ?? "Generic",
      x: n.position.x,
      y: n.position.y,
      ...(d.sublabel !== undefined ? { sublabel: d.sublabel } : {}),
      ...(d.state !== undefined ? { state: d.state } : {}),
      ...(d.props !== undefined ? { props: d.props } : {}),
      ...(d.spec !== undefined ? { spec: d.spec } : {}),
      ...(d.notes !== undefined ? { notes: d.notes } : {}),
    };
  });

  const specEdges: SpecEdge[] = edges.map((e) => {
    const d = (e.data ?? {}) as {
      kind?: EdgeKind;
      sourceHandle?: string;
      targetHandle?: string;
      route?: SpecEdge["route"];
      lane?: number;
      arrowStyle?: SpecEdge["arrowStyle"];
      valueLabel?: string;
      label?: string;
    };
    return {
      id: e.id,
      source: e.source,
      sourceHandle: d.sourceHandle ?? "",
      target: e.target,
      targetHandle: d.targetHandle ?? "",
      kind: d.kind ?? "any",
      ...(typeof d.label === "string"
        ? { label: d.label }
        : typeof e.label === "string" ? { label: e.label } : {}),
      ...(d.valueLabel !== undefined ? { valueLabel: d.valueLabel } : {}),
      ...(d.route !== undefined ? { route: d.route } : {}),
      ...(d.lane !== undefined ? { lane: d.lane } : {}),
      ...(d.arrowStyle !== undefined ? { arrowStyle: d.arrowStyle } : {}),
    };
  });

  // Reassemble spec.notes[] from RF "note" nodes. Sort by the `__note-N`
  // suffix so iteration order matches the original spec regardless of how
  // RF reordered them.
  const noteNodes = nodes
    .filter((n) => n.type === "note")
    .slice()
    .sort((a, b) => {
      const ai = parseInt(a.id.replace(/^__note-/, ""), 10);
      const bi = parseInt(b.id.replace(/^__note-/, ""), 10);
      return (Number.isFinite(ai) ? ai : 0) - (Number.isFinite(bi) ? bi : 0);
    });
  const specNotes = noteNodes.map((n) => {
    const d = (n.data ?? {}) as {
      text?: string;
      width?: number;
      height?: number;
      hasWidth?: boolean;
      hasHeight?: boolean;
    };
    return {
      x: n.position.x,
      y: n.position.y,
      ...(d.hasWidth ? { width: d.width } : {}),
      ...(d.hasHeight ? { height: d.height } : {}),
      text: d.text ?? "",
    };
  });

  const out: Spec = { nodes: specNodes, edges: specEdges };
  if (specNotes.length > 0) out.notes = specNotes;
  return out;
}
