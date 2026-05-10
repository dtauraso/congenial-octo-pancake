// Ticked substrate — Phase 2: step-driven only. No interval driver;
// ticks advance on explicit step() calls (user click). Subscribers are
// notified after each step so UI can refresh between-tick state.
// See docs/planning/visual-editor/handoff-ticked-substrate-plan.md.

import type { StateValue } from "../../schema";
import { publishTick, publishEdgeArrive } from "../node-streams";

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
  listeners: Set<() => void>;
};

export function makeRuntime(nodes: NodeRunner[], edgeIds: string[]): Runtime {
  const inbox: Inbox = new Map(edgeIds.map((id) => [id, [] as StateValue[]]));
  return { nodes, inbox, tick: 0, listeners: new Set() };
}

export function step(rt: Runtime): number {
  for (const n of rt.nodes) {
    let active = false;
    const ctx: Ctx = {
      recv: (eid) => {
        const v = rt.inbox.get(eid)?.shift();
        if (v !== undefined) active = true;
        return v;
      },
      send: (eid, v) => {
        rt.inbox.get(eid)!.push(v);
        publishEdgeArrive(eid, v);
        active = true;
      },
      inboxLen: (eid) => rt.inbox.get(eid)?.length ?? 0,
    };
    n.run(ctx);
    if (active) publishTick(n.id);
  }
  rt.tick += 1;
  for (const fn of rt.listeners) fn();
  return rt.tick;
}

export function subscribe(rt: Runtime, fn: () => void): () => void {
  rt.listeners.add(fn);
  return () => { rt.listeners.delete(fn); };
}

export function inboxLen(rt: Runtime, edgeId: string): number {
  return rt.inbox.get(edgeId)?.length ?? 0;
}

export function inboxSnapshot(rt: Runtime, edgeId: string): StateValue[] {
  return [...(rt.inbox.get(edgeId) ?? [])];
}
