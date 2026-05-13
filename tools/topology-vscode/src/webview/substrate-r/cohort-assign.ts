// Cohort assignment for the live editor graph, decoupled from
// parseSpec (which also validates ports/kinds). Same algorithm as
// spec.ts:assignCohorts but operates on minimal edge tuples so a
// transient invalid editor state doesn't throw.
//
// cohort(W) = 0 if W.source has no incoming edges,
//             max(cohort(P) for P incoming to W.source) + 1 otherwise.

export interface CohortEdge {
  id: string;
  source: string;
  target: string;
}

export function assignCohortsForEdges(edges: CohortEdge[]): Map<string, number> {
  const incomingByNode = new Map<string, CohortEdge[]>();
  for (const e of edges) {
    const list = incomingByNode.get(e.target) ?? [];
    list.push(e);
    incomingByNode.set(e.target, list);
  }
  const cohort = new Map<string, number>();
  const visiting = new Set<string>();
  const edgeById = new Map(edges.map((e) => [e.id, e]));
  const visit = (e: CohortEdge): number => {
    const cached = cohort.get(e.id);
    if (cached !== undefined) return cached;
    if (visiting.has(e.id)) return 0;
    visiting.add(e.id);
    const preds = incomingByNode.get(e.source) ?? [];
    const c = preds.length === 0 ? 0 : Math.max(...preds.map(visit)) + 1;
    visiting.delete(e.id);
    cohort.set(e.id, c);
    return c;
  };
  for (const e of edges) {
    cohort.set(e.id, visit(edgeById.get(e.id)!));
  }
  return cohort;
}
