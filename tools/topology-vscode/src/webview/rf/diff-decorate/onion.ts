// Mode B onion-skin: live spec renders solid; the *entire* other spec
// rides underneath as ghost nodes/edges. Agreement (same node, same
// position) disappears visually because the solid live node sits on
// top of its ghost twin; disagreement peeks out. No diff halos in
// this mode — the overlay itself is the diff.

import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import { KIND_COLORS, type Spec } from "../../../schema";
import type { Fold } from "../../viewerState";
import { specToFlow } from "../adapter";
import { GHOST_PREFIX, appendClass, ghostNode } from "./ghost";

export function decorateForOnion(
  live: Spec,
  other: Spec,
  folds: Fold[],
): { nodes: RFNode[]; edges: RFEdge[] } {
  const flow = specToFlow(live, folds, {});
  // Live nodes get a marker class so the spacebar swap (.ghost-front
  // on the wrapper) can bump ghosts above them via CSS without
  // touching live's zIndex.
  const liveNodes = flow.nodes.map((n) =>
    n.type === "fold"
      ? n
      : { ...n, className: appendClass(n.className, "onion-live") },
  );
  const ghostNodes = other.nodes.map((n) => ghostNode(n, "onion-ghost"));
  const liveNodeIds = new Set(liveNodes.map((n) => n.id));
  const ghostNodeIds = new Set(ghostNodes.map((n) => n.id));
  const ghostEdges: RFEdge[] = [];
  for (const e of other.edges) {
    // Prefer ghost twin so the ghost edge attaches to the ghost layer.
    const s = ghostNodeIds.has(`${GHOST_PREFIX}${e.source}`)
      ? `${GHOST_PREFIX}${e.source}`
      : liveNodeIds.has(e.source)
        ? e.source
        : null;
    const t = ghostNodeIds.has(`${GHOST_PREFIX}${e.target}`)
      ? `${GHOST_PREFIX}${e.target}`
      : liveNodeIds.has(e.target)
        ? e.target
        : null;
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
  return {
    nodes: [...ghostNodes, ...liveNodes],
    edges: [...ghostEdges, ...flow.edges],
  };
}
