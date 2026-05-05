// Concurrent-edge classifier (Phase 5.5 N1').
//
// An edge is "concurrent" when its source fires freely — i.e. is not a
// gate (join/latch) node and is not downstream of one. Concurrent
// edges drive a self-pacing re-emission loop in the runner, so that
// pulse N+1 leaves the source when pulse N arrives at the target. The
// visible cycle rate then emerges from each edge's traversal time,
// surfacing which parts of the topology run in parallel.
//
// Algorithm: forward BFS over spec.edges from every gate-type node
// (gates themselves included) to compute the gated set. An edge is
// concurrent iff edge.source is not in the gated set. Per-edge
// `concurrent: true | false` overrides the auto-classification.

import type { Spec } from "../schema";
import { GATE_TYPES } from "./handlers";

export function classifyConcurrentEdges(spec: Spec): Set<string> {
  const typeOf = new Map<string, string>();
  for (const n of spec.nodes) typeOf.set(n.id, n.type);

  const fwd = new Map<string, string[]>();
  for (const e of spec.edges) {
    const arr = fwd.get(e.source);
    if (arr) arr.push(e.target);
    else fwd.set(e.source, [e.target]);
  }

  const gated = new Set<string>();
  const stack: string[] = [];
  for (const n of spec.nodes) {
    if (GATE_TYPES.has(n.type)) {
      gated.add(n.id);
      stack.push(n.id);
    }
  }
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const outs = fwd.get(cur);
    if (!outs) continue;
    for (const t of outs) {
      if (!gated.has(t)) {
        gated.add(t);
        stack.push(t);
      }
    }
  }

  const concurrent = new Set<string>();
  for (const e of spec.edges) {
    if (e.concurrent === false) continue;
    if (e.concurrent === true) {
      concurrent.add(e.id);
      continue;
    }
    // Input-sourced edges are driven by the seed sequence (and
    // pendingSeeds for atTick>0), not by the N1' self-pacer. Self-pacing
    // an Input would re-fire its last init value forever, conflicting
    // with the deterministic [v0, v1, ...] sequence the seed defines.
    if (typeOf.get(e.source) === "Input") continue;
    if (!gated.has(e.source)) concurrent.add(e.id);
  }
  return concurrent;
}
