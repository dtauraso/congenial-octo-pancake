// Step 7b: walk a Spec's edge list and instantiate one wire-entity per
// edge. Sibling to the legacy build-wires.ts (chan-wire); kept separate
// because the wire-entity model has different semantics (load on
// non-empty throws, no buffer cap). Returns a Map keyed by edge id so
// the host-shim runner can hand each node its inbound + outbound wires.

import type { Spec } from "../schema";
import { createWire, type Wire } from "./wire-entity";

export type WireEntityMap = Map<string, Wire<unknown>>;

export function buildWireEntities(spec: Spec): WireEntityMap {
  const map: WireEntityMap = new Map();
  for (const edge of spec.edges ?? []) {
    if (map.has(edge.id)) {
      throw new Error(`buildWireEntities: duplicate edge id ${edge.id}`);
    }
    map.set(edge.id, createWire<unknown>(edge.id));
  }
  return map;
}
