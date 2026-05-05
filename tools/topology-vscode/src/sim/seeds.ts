// Seed authoring + edge/node `data` field readers. Pure helpers for
// pulling `init`, `delay`, and `slots` off the opaque per-edge/per-node
// data payload, plus the fallback Input-node seed used when a spec
// has no explicit `timing.seed`.

import type { Spec, SeedEvent, StateValue } from "../schema";

// Per-edge traversal delay. Overrides the emission's default delay so a
// single source can fan out to edges of different lengths/latencies.
// Modeled on `data.init`: opaque field, only the well-known shape is
// honored. Negative or non-numeric values fall back to the default.
export function readEdgeDelay(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = (data as { delay?: unknown }).delay;
  return typeof d === "number" && d >= 0 ? d : undefined;
}

// Per-edge slot capacity. Default is 1 — every edge behaves like an
// unbuffered Go channel (sender blocks until receiver reads). Mirrors
// what the wirefold latch+gate+ack pattern already enforces in the Go
// runtime: at most one value in flight on each edge. Explicit
// `data.slots: N` overrides for edges that genuinely need a buffer.
export const DEFAULT_EDGE_SLOTS = 1;

export function readEdgeSlots(data: unknown): number {
  if (!data || typeof data !== "object") return DEFAULT_EDGE_SLOTS;
  const s = (data as { slots?: unknown }).slots;
  return typeof s === "number" && s >= 1 ? Math.floor(s) : DEFAULT_EDGE_SLOTS;
}

// Pull `data.init: number[]` off an edge's opaque `data` field. Returns
// [] for any other shape so unrelated `data` payloads (decoration,
// labels) don't accidentally seed events.
export function readEdgeInit(data: unknown): StateValue[] {
  if (!data || typeof data !== "object") return [];
  const init = (data as { init?: unknown }).init;
  if (!Array.isArray(init)) return [];
  return init.filter(
    (v): v is StateValue => typeof v === "number" || typeof v === "string",
  );
}

export function readNodeInit(data: unknown): StateValue[] {
  return readEdgeInit(data);
}

// Fallback when the spec has no `timing.seed`: feed each Input node's
// `data.init: [...]` array (matches Go's `<- ch` priming) onto its
// `out` port, one tick apart. Falls back to a single value=1 pulse if
// no init array is present, so play does something visible on any
// topology with at least one Input.
export function defaultSeed(spec: Spec): SeedEvent[] {
  const out: SeedEvent[] = [];
  for (const n of spec.nodes) {
    if (n.type !== "Input") continue;
    const init = readNodeInit(n.data);
    if (init.length === 0) {
      out.push({ nodeId: n.id, outPort: "out", value: 1, atTick: 0 });
      continue;
    }
    init.forEach((v, i) => {
      out.push({ nodeId: n.id, outPort: "out", value: v, atTick: i });
    });
  }
  return out;
}
