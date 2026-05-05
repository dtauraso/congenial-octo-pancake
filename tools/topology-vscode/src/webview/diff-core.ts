// Pure spec ↔ spec diff. No RF / adapter dependency — kept that way so the
// renderer can decorate from this output without round-tripping through the
// flow model. See docs/planning/visual-editor/phase-5.md.

import type { Spec } from "../schema";

// Position fields (x, y) moved to topology.view.json in audit #15.
// "moved" detection would require comparing view state across snapshots;
// for now the moved list is always empty (layout diffs are view-only).
export const POSITION_EPSILON = 1;

export type SpecDiff = {
  nodes: { added: string[]; removed: string[]; moved: string[] };
  edges: { added: string[]; removed: string[]; rewired: string[] };
};

export function diffSpecs(a: Spec, b: Spec): SpecDiff {
  const aNodes = new Map(a.nodes.map((n) => [n.id, n]));
  const bNodes = new Map(b.nodes.map((n) => [n.id, n]));
  const nodesAdded: string[] = [];
  const nodesRemoved: string[] = [];
  const nodesMoved: string[] = [];
  for (const id of aNodes.keys()) if (!bNodes.has(id)) nodesRemoved.push(id);
  for (const [id] of bNodes) {
    const an = aNodes.get(id);
    if (!an) { nodesAdded.push(id); }
    // Position is view-only; no moved detection from spec alone.
  }

  const aEdges = new Map(a.edges.map((e) => [e.id, e]));
  const bEdges = new Map(b.edges.map((e) => [e.id, e]));
  const edgesAdded: string[] = [];
  const edgesRemoved: string[] = [];
  const edgesRewired: string[] = [];
  for (const id of aEdges.keys()) if (!bEdges.has(id)) edgesRemoved.push(id);
  for (const [id, be] of bEdges) {
    const ae = aEdges.get(id);
    if (!ae) { edgesAdded.push(id); continue; }
    if (
      ae.source !== be.source ||
      ae.sourceHandle !== be.sourceHandle ||
      ae.target !== be.target ||
      ae.targetHandle !== be.targetHandle
    ) {
      edgesRewired.push(id);
    }
  }

  const sort = (xs: string[]) => xs.slice().sort();
  return {
    nodes: { added: sort(nodesAdded), removed: sort(nodesRemoved), moved: sort(nodesMoved) },
    edges: { added: sort(edgesAdded), removed: sort(edgesRemoved), rewired: sort(edgesRewired) },
  };
}
