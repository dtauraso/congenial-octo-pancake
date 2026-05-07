// Walk a Spec's edge list and instantiate one Wire per edge. Returns
// a Map keyed by edge id. No node wiring yet — the runtime (commit 2)
// is responsible for handing each node its inbound + outbound wires
// from this map.
//
// cap defaults to 0 (unbuffered) per chan-wire's decision. A future
// per-edge override can read from edge.data, but we don't need that
// for the trivial Input -> ReadGate topology that gates this stretch.

import type { Spec } from "../schema";
import type { Edge } from "../schema/types-graph";
import { createWire, type Wire } from "./wire";

export type WireMap = Map<string, Wire>;

export function buildWires(spec: Spec): WireMap {
  const map: WireMap = new Map();
  const edges: Edge[] = spec.edges ?? [];
  for (const edge of edges) {
    if (map.has(edge.id)) {
      throw new Error(`buildWires: duplicate edge id ${edge.id}`);
    }
    map.set(edge.id, createWire(edge.id, 0));
  }
  return map;
}
