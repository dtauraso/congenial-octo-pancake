// Ticked substrate — Phase 1 MVP, Shape A only.
// Substrate owns nodes and a tick counter. One full pass through nodes
// in topological order = one tick. A run() call delivers its emit to
// the receiver's inbound port before returning, so a wave traverses
// the DAG end-to-end in a single tick.
// See docs/planning/visual-editor/handoff-ticked-substrate-plan.md.

import type { StateValue } from "../../schema";

export type Inbox = Map<string, StateValue[]>;
export type Ctx = {
  recv: (edgeId: string) => StateValue | undefined;
  send: (edgeId: string, v: StateValue) => void;
  inboxLen: (edgeId: string) => number;
};
export type NodeRunner = { id: string; inEdges: string[]; outEdges: string[]; run: (ctx: Ctx) => void };

export type Runtime = {
  nodes: NodeRunner[];
  inbox: Inbox;
  tick: number;
  driver: ReturnType<typeof setInterval> | null;
  running: boolean;
};

export function makeRuntime(nodes: NodeRunner[], edgeIds: string[]): Runtime {
  const inbox: Inbox = new Map(edgeIds.map((id) => [id, [] as StateValue[]]));
  return { nodes, inbox, tick: 0, driver: null, running: true };
}

export function step(rt: Runtime): number {
  if (!rt.running) return rt.tick;
  const ctx: Ctx = {
    recv: (eid) => rt.inbox.get(eid)?.shift(),
    send: (eid, v) => { rt.inbox.get(eid)!.push(v); },
    inboxLen: (eid) => rt.inbox.get(eid)?.length ?? 0,
  };
  for (const n of rt.nodes) n.run(ctx);
  rt.tick += 1;
  return rt.tick;
}

export function startDriver(rt: Runtime, intervalMs: number): void {
  if (rt.driver) return;
  rt.driver = setInterval(() => { step(rt); }, intervalMs);
}

export function stopRuntime(rt: Runtime): void {
  if (rt.driver) clearInterval(rt.driver);
  rt.driver = null;
  rt.running = false;
}

export function inboxLen(rt: Runtime, edgeId: string): number {
  return rt.inbox.get(edgeId)?.length ?? 0;
}
