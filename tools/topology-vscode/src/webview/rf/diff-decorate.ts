// Mode A diff decoration: take a visible spec + the other spec, produce the
// React Flow nodes/edges for the visible side with diff classNames merged
// in, plus injected "ghost" nodes/edges for items that exist only on the
// other side (so .diff-removed has somewhere to render). Pure spec↔flow —
// stays out of adapter.ts to keep the round-trip test honest.

import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import { KIND_COLORS, NODE_TYPES, type Node as SpecNode, type Spec } from "../../schema";
import type { Fold } from "../viewerState";
import { diffSpecs } from "../diff-core";
import { specToFlow } from "./adapter";

const GHOST_PREFIX = "__ghost__";
const CONNECTOR_PREFIX = "__moved_connector__";

function ghostNode(n: SpecNode, extraClass: string): RFNode {
  const def = NODE_TYPES[n.type];
  return {
    id: `${GHOST_PREFIX}${n.id}`,
    type: "animated",
    position: { x: n.x, y: n.y },
    selectable: false,
    draggable: false,
    focusable: false,
    className: `ghost ${extraClass}`.trim(),
    data: {
      label: n.id,
      sublabel: n.sublabel,
      type: n.type,
      fill: def?.fill ?? "#ffffff",
      stroke: def?.stroke ?? "#888",
      shape: def?.shape ?? "rect",
      width: def?.width ?? 110,
      height: def?.height ?? 60,
      inputs: def?.inputs ?? [],
      outputs: def?.outputs ?? [],
    },
  };
}

function appendClass(existing: string | undefined, extra: string): string {
  return existing ? `${existing} ${extra}` : extra;
}

export function decorateForCompare(
  visible: Spec,
  other: Spec,
  folds: Fold[],
): { nodes: RFNode[]; edges: RFEdge[] } {
  const flow = specToFlow(visible, folds);
  const diff = diffSpecs(other, visible);
  // diff(other, visible): nodes.added = on visible only; nodes.removed = on
  // other only; symmetric for edges. We orient the call so "added" lines up
  // with the visible-side highlights regardless of which side is shown.

  const visibleNodeById = new Map(visible.nodes.map((n) => [n.id, n]));
  const otherNodeById = new Map(other.nodes.map((n) => [n.id, n]));

  const addedNodes = new Set(diff.nodes.added);
  const removedNodes = new Set(diff.nodes.removed);
  const movedNodes = new Set(diff.nodes.moved);
  const addedEdges = new Set(diff.edges.added);
  const rewiredEdges = new Set(diff.edges.rewired);
  const removedEdgeIds = new Set(diff.edges.removed);

  // Per-fold diff tally: when a fold is collapsed, its members are absent
  // from the rendered flow, so add/remove/move signals inside the fold
  // are otherwise invisible. Surface as counts on the fold's data so the
  // collapsed placeholder can render a badge.
  const foldCounts = new Map<string, { added: number; removed: number; moved: number }>();
  for (const f of folds) {
    if (!f.collapsed) continue;
    let added = 0, removed = 0, moved = 0;
    for (const id of f.memberIds) {
      if (addedNodes.has(id)) added++;
      if (removedNodes.has(id)) removed++;
      if (movedNodes.has(id)) moved++;
    }
    if (added || removed || moved) foldCounts.set(f.id, { added, removed, moved });
  }

  const nodes: RFNode[] = flow.nodes.map((n) => {
    if (n.type === "fold") {
      const counts = foldCounts.get(n.id);
      if (!counts) return n;
      return { ...n, data: { ...n.data, diffCounts: counts } };
    }
    const cls: string[] = [];
    if (addedNodes.has(n.id)) cls.push("diff-added");
    if (movedNodes.has(n.id)) cls.push("diff-moved");
    if (cls.length === 0) return n;
    return { ...n, className: appendClass(n.className, cls.join(" ")) };
  });

  // Inject ghost nodes for ids only in `other` (red halo on visible canvas).
  for (const id of removedNodes) {
    const n = otherNodeById.get(id);
    if (!n) continue;
    nodes.push(ghostNode(n, "diff-removed"));
  }

  // Inject ghost copies for moved nodes at their other-side position.
  for (const id of movedNodes) {
    const n = otherNodeById.get(id);
    if (!n) continue;
    nodes.push(ghostNode(n, "diff-moved"));
  }

  const edges: RFEdge[] = flow.edges.map((e) => {
    const cls: string[] = [];
    if (addedEdges.has(e.id)) cls.push("diff-added");
    if (rewiredEdges.has(e.id)) cls.push("diff-rewired");
    if (cls.length === 0) return e;
    return { ...e, className: appendClass(e.className, cls.join(" ")) };
  });

  // Synthetic connector: each moved node draws a thin dashed edge from its
  // visible position to the ghost at its other-side position.
  for (const id of movedNodes) {
    const visN = visibleNodeById.get(id);
    const othN = otherNodeById.get(id);
    if (!visN || !othN) continue;
    edges.push({
      id: `${CONNECTOR_PREFIX}${id}`,
      source: id,
      target: `${GHOST_PREFIX}${id}`,
      type: "default",
      deletable: false,
      focusable: false,
      className: "diff-moved-connector",
      style: { stroke: "#c98a00", strokeWidth: 1, strokeDasharray: "4 3" },
      data: { synthetic: true },
    });
  }

  // Inject ghost edges for ids only in `other`, when both endpoints resolve
  // (real visible node OR a ghost we just injected). Skip otherwise — fold
  // re-routing makes some endpoints unaddressable, and step 4 doesn't try
  // to handle that.
  const renderedNodeIds = new Set(nodes.map((n) => n.id));
  const resolveEnd = (id: string): string | null => {
    if (renderedNodeIds.has(id)) return id;
    const ghosted = `${GHOST_PREFIX}${id}`;
    if (renderedNodeIds.has(ghosted)) return ghosted;
    return null;
  };
  for (const id of removedEdgeIds) {
    const oe = other.edges.find((e) => e.id === id);
    if (!oe) continue;
    const s = resolveEnd(oe.source);
    const t = resolveEnd(oe.target);
    if (!s || !t) continue;
    edges.push({
      id: `${GHOST_PREFIX}${id}`,
      source: s,
      target: t,
      type: "default",
      deletable: false,
      focusable: false,
      className: "ghost diff-removed",
      style: { stroke: KIND_COLORS[oe.kind] ?? "#888", strokeWidth: 1.5 },
      data: { synthetic: true },
    });
  }

  return { nodes, edges };
}

// Mode B onion-skin: live spec renders solid; the *entire* other spec rides
// underneath as ghost nodes/edges. Agreement (same node, same position)
// disappears visually because the solid live node sits on top of its ghost
// twin; disagreement peeks out. No diff halos in this mode — the overlay
// itself is the diff.
export function decorateForOnion(
  live: Spec,
  other: Spec,
  folds: Fold[],
): { nodes: RFNode[]; edges: RFEdge[] } {
  const flow = specToFlow(live, folds);
  // Live nodes get a marker class so the spacebar swap (.ghost-front on
  // the wrapper) can bump ghosts above them via CSS without touching live's
  // zIndex.
  const liveNodes = flow.nodes.map((n) =>
    n.type === "fold" ? n : { ...n, className: appendClass(n.className, "onion-live") },
  );
  const ghostNodes = other.nodes.map((n) => ghostNode(n, "onion-ghost"));
  const liveNodeIds = new Set(liveNodes.map((n) => n.id));
  const ghostNodeIds = new Set(ghostNodes.map((n) => n.id));
  const ghostEdges: RFEdge[] = [];
  for (const e of other.edges) {
    // Resolve endpoints: prefer ghost twin (when the other spec has the
    // node) so the ghost edge attaches to the ghost layer, not the live
    // layer. Fall back to live (rare — ghost node always exists for ids
    // in other.nodes; this is for safety).
    const s =
      ghostNodeIds.has(`${GHOST_PREFIX}${e.source}`) ? `${GHOST_PREFIX}${e.source}` :
      liveNodeIds.has(e.source) ? e.source : null;
    const t =
      ghostNodeIds.has(`${GHOST_PREFIX}${e.target}`) ? `${GHOST_PREFIX}${e.target}` :
      liveNodeIds.has(e.target) ? e.target : null;
    if (!s || !t) continue;
    ghostEdges.push({
      id: `${GHOST_PREFIX}${e.id}`,
      source: s,
      target: t,
      type: "default",
      deletable: false,
      focusable: false,
      className: "ghost onion-ghost",
      style: { stroke: KIND_COLORS[e.kind] ?? "#888", strokeWidth: 1.5 },
      data: { synthetic: true },
    });
  }
  // Ghosts first in the array so default RF stacking puts them below live.
  return { nodes: [...ghostNodes, ...liveNodes], edges: [...ghostEdges, ...flow.edges] };
}
