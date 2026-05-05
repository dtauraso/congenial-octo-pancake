// Mode A diff decoration: take a visible spec + the other spec, produce
// the React Flow nodes/edges for the visible side with diff classNames
// merged in, plus injected "ghost" nodes/edges for items that exist
// only on the other side. Pure spec↔flow.

import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import { KIND_COLORS, type Spec } from "../../../schema";
import { diffSpecs } from "../../diff-core";
import type { Fold } from "../../viewerState";
import { specToFlow } from "../adapter";
import { CONNECTOR_PREFIX, GHOST_PREFIX, appendClass, ghostNode } from "./ghost";
import { computeFoldCounts } from "./fold-counts";

export function decorateForCompare(
  visible: Spec,
  other: Spec,
  folds: Fold[],
): { nodes: RFNode[]; edges: RFEdge[] } {
  const flow = specToFlow(visible, folds, {});
  // diff(other, visible): nodes.added = on visible only; nodes.removed
  // = on other only. Orient so "added" lines up with visible-side
  // highlights regardless of which side is shown.
  const diff = diffSpecs(other, visible);
  const visibleNodeById = new Map(visible.nodes.map((n) => [n.id, n]));
  const otherNodeById = new Map(other.nodes.map((n) => [n.id, n]));
  const addedNodes = new Set(diff.nodes.added);
  const removedNodes = new Set(diff.nodes.removed);
  const movedNodes = new Set(diff.nodes.moved);
  const addedEdges = new Set(diff.edges.added);
  const rewiredEdges = new Set(diff.edges.rewired);
  const removedEdgeIds = new Set(diff.edges.removed);
  const foldCounts = computeFoldCounts(folds, addedNodes, removedNodes, movedNodes);

  const nodes: RFNode[] = flow.nodes.map((n) => {
    if (n.type === "fold") {
      const counts = foldCounts.get(n.id);
      return counts ? { ...n, data: { ...n.data, diffCounts: counts } } : n;
    }
    const cls: string[] = [];
    if (addedNodes.has(n.id)) cls.push("diff-added");
    if (movedNodes.has(n.id)) cls.push("diff-moved");
    return cls.length === 0
      ? n
      : { ...n, className: appendClass(n.className, cls.join(" ")) };
  });

  for (const id of removedNodes) {
    const n = otherNodeById.get(id);
    if (n) nodes.push(ghostNode(n, "diff-removed"));
  }
  for (const id of movedNodes) {
    const n = otherNodeById.get(id);
    if (n) nodes.push(ghostNode(n, "diff-moved"));
  }

  const edges: RFEdge[] = flow.edges.map((e) => {
    const cls: string[] = [];
    if (addedEdges.has(e.id)) cls.push("diff-added");
    if (rewiredEdges.has(e.id)) cls.push("diff-rewired");
    return cls.length === 0
      ? e
      : { ...e, className: appendClass(e.className, cls.join(" ")) };
  });

  // Synthetic connector: each moved node draws a thin dashed edge from
  // its visible position to the ghost at its other-side position.
  for (const id of movedNodes) {
    if (!visibleNodeById.has(id) || !otherNodeById.has(id)) continue;
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

  // Inject ghost edges for ids only in `other`, when both endpoints
  // resolve. Fold re-routing makes some endpoints unaddressable; skip
  // those rather than guess.
  const renderedNodeIds = new Set(nodes.map((n) => n.id));
  const resolveEnd = (id: string): string | null => {
    if (renderedNodeIds.has(id)) return id;
    const ghosted = `${GHOST_PREFIX}${id}`;
    return renderedNodeIds.has(ghosted) ? ghosted : null;
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
