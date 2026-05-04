// Phase 7 Chunk 1 — trace wire format.
//
// A trace is the on-disk projection of a simulator (or Go runtime) run:
// an ordered sequence of points-of-interest serialized as JSON-lines.
// Closed vocabulary; new visual behaviors require extending both
// producer and parser. See docs/planning/trace-replay-plan.md.
//
// Three event kinds in this chunk:
//   recv  — node received `value` at `port`
//   fire  — node's handler produced ≥1 emission
//   send  — value sent on `edge`
//
// Structural events (node-add / move / edge-rewire) and `state-set`
// are intentionally omitted. Phase 6 derives motion from re-running
// handlers on replay, so state diffs aren't part of the wire format.
//
// `step` is the recorder-assigned monotonic ordinal across the whole
// trace. Drift comparison (Chunk 2) ignores `step` and compares by
// position in the sequence under the projection
// `(kind, node|edge, port?, value?)`.

import type { Spec, StateValue } from "../schema";
import type { FireRecord } from "./simulator";

export type RecvEvent = {
  step: number;
  kind: "recv";
  node: string;
  port: string;
  value: StateValue;
};

export type FireEventT = {
  step: number;
  kind: "fire";
  node: string;
};

export type SendEvent = {
  step: number;
  kind: "send";
  edge: string;
  value: StateValue;
};

export type TraceEvent = RecvEvent | FireEventT | SendEvent;

const KINDS = new Set(["recv", "fire", "send"]);

export function serializeTrace(events: readonly TraceEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join("\n") + (events.length ? "\n" : "");
}

export function parseTrace(jsonl: string): TraceEvent[] {
  const out: TraceEvent[] = [];
  const lines = jsonl.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch (err) {
      throw new Error(`trace line ${i + 1}: invalid JSON (${(err as Error).message})`);
    }
    out.push(validateEvent(obj, i + 1));
  }
  // Validate monotonic step.
  for (let i = 1; i < out.length; i++) {
    if (out[i].step <= out[i - 1].step) {
      throw new Error(
        `trace line ${i + 1}: step ${out[i].step} not greater than previous ${out[i - 1].step}`,
      );
    }
  }
  return out;
}

function validateEvent(o: unknown, line: number): TraceEvent {
  if (!o || typeof o !== "object") throw new Error(`trace line ${line}: not an object`);
  const r = o as Record<string, unknown>;
  if (typeof r.step !== "number" || !Number.isInteger(r.step) || r.step < 0) {
    throw new Error(`trace line ${line}: missing/invalid 'step'`);
  }
  if (typeof r.kind !== "string" || !KINDS.has(r.kind)) {
    throw new Error(`trace line ${line}: unknown kind '${String(r.kind)}'`);
  }
  switch (r.kind) {
    case "recv":
      requireString(r, "node", line);
      requireString(r, "port", line);
      requireValue(r, "value", line);
      return { step: r.step, kind: "recv", node: r.node as string, port: r.port as string, value: r.value as StateValue };
    case "fire":
      requireString(r, "node", line);
      return { step: r.step, kind: "fire", node: r.node as string };
    case "send":
      requireString(r, "edge", line);
      requireValue(r, "value", line);
      return { step: r.step, kind: "send", edge: r.edge as string, value: r.value as StateValue };
  }
  throw new Error(`trace line ${line}: unreachable`);
}

function requireString(r: Record<string, unknown>, k: string, line: number): void {
  if (typeof r[k] !== "string" || (r[k] as string).length === 0) {
    throw new Error(`trace line ${line}: missing/invalid '${k}'`);
  }
}

function requireValue(r: Record<string, unknown>, k: string, line: number): void {
  const v = r[k];
  if (typeof v !== "string" && typeof v !== "number") {
    throw new Error(`trace line ${line}: '${k}' must be string|number`);
  }
}

// Lower a sequence of FireRecords (the simulator's history) into the
// wire-format event stream. One FireRecord becomes:
//   recv(node,port,value)
//   [fire(node)]            -- only if the handler emitted anything
//   send(edge,value) × |outgoing edges per emission|
//
// Edge fan-out is resolved against the spec at serialize time so the
// trace records the same edge-IDs the runner would animate.
export function historyToTrace(history: readonly FireRecord[], spec: Spec): TraceEvent[] {
  const out: TraceEvent[] = [];
  let step = 0;
  for (const rec of history) {
    out.push({
      step: step++,
      kind: "recv",
      node: rec.nodeId,
      port: rec.inputPort,
      value: rec.inputValue,
    });
    if (rec.emissions.length > 0) {
      out.push({ step: step++, kind: "fire", node: rec.nodeId });
      for (const em of rec.emissions) {
        for (const edge of spec.edges) {
          if (edge.source === rec.nodeId && edge.sourceHandle === em.port) {
            out.push({ step: step++, kind: "send", edge: edge.id, value: em.value });
          }
        }
      }
    }
  }
  return out;
}
