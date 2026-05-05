// One-shot migration: topology.json files that predate audit #15 may still
// carry x/y/sublabel/state on nodes and route on edges. Extract those fields
// from the raw JSON before parseSpec strips them, and seed viewerState with
// them when the view doesn't already have entries for those ids.
//
// "View wins" — if topology.view.json already populated view.nodes[id] we
// leave it alone; the legacy spec field is simply dropped on next save.

import type { ViewerState, NodeView, EdgeView } from "../../viewerState";

type RawNode = {
  id?: unknown;
  x?: unknown;
  y?: unknown;
  sublabel?: unknown;
  state?: unknown;
};

type RawEdge = {
  id?: unknown;
  route?: unknown;
};

const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export function migrateLegacyFields(raw: unknown, vs: ViewerState): void {
  if (!isObj(raw)) return;
  const nodes = raw.nodes;
  const edges = raw.edges;

  if (Array.isArray(nodes)) {
    for (const n of nodes as RawNode[]) {
      if (!isStr(n.id)) continue;
      // View wins — skip if we already have an entry for this node.
      if (vs.nodes?.[n.id]) continue;
      if (!isNum(n.x) || !isNum(n.y)) continue;
      const nv: NodeView = { x: n.x, y: n.y };
      if (isStr(n.sublabel)) nv.sublabel = n.sublabel;
      if (isObj(n.state)) nv.state = n.state as NodeView["state"];
      if (!vs.nodes) vs.nodes = {};
      vs.nodes[n.id] = nv;
    }
  }

  if (Array.isArray(edges)) {
    for (const e of edges as RawEdge[]) {
      if (!isStr(e.id)) continue;
      if (vs.edges?.[e.id]) continue;
      if (e.route !== "line" && e.route !== "snake" && e.route !== "below") continue;
      const ev: EdgeView = { route: e.route };
      if (!vs.edges) vs.edges = {};
      vs.edges[e.id] = ev;
    }
  }
}
