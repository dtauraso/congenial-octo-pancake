// parseSpec entry point. Composes node/edge/meta parsers and runs the
// validatePorts pass. Legacy `timing.steps` is silently dropped — it
// was the SVG-era master script, replaced by per-node handlers + seed
// events in Phase 5.5.

import type { Spec } from "./types-graph";
import { arr, obj, opt, str } from "./parse-primitives";
import { parseEdge, parseNode } from "./parse-nodes-edges";
import {
  parseLegendRow,
  parseNote,
  parseSeedEvent,
  validatePorts,
} from "./parse-meta";

export function parseSpec(input: unknown): Spec {
  const o = obj(input, "spec");
  const spec: Spec = {
    nodes: arr(o.nodes, "spec.nodes").map((n, i) =>
      parseNode(n, `spec.nodes[${i}]`),
    ),
    edges: arr(o.edges, "spec.edges").map((e, i) =>
      parseEdge(e, `spec.edges[${i}]`),
    ),
    timing: opt(o.timing, (t) => {
      const to = obj(t, "spec.timing");
      return {
        duration: opt(to.duration, (x) => str(x, "spec.timing.duration")),
        seed: opt(to.seed, (x) =>
          arr(x, "spec.timing.seed").map((e, i) =>
            parseSeedEvent(e, `spec.timing.seed[${i}]`),
          ),
        ),
      };
    }),
    cycleAnchor: opt(o.cycleAnchor, (x) => str(x, "spec.cycleAnchor")),
    legend: opt(o.legend, (l) =>
      arr(l, "spec.legend").map((r, i) =>
        parseLegendRow(r, `spec.legend[${i}]`),
      ),
    ),
    notes: opt(o.notes, (l) =>
      arr(l, "spec.notes").map((n, i) => parseNote(n, `spec.notes[${i}]`)),
    ),
  };
  validatePorts(spec);
  return spec;
}
