import type { Spec } from "../../schema";
import { getHandler } from "../handlers";
import { freeEdgeSlot, noteEdgeConsumed } from "../slot-release";
import { initWorld } from "./init-world";
import { resolveProps, scheduleEmission } from "./schedule";
import { type World, indexEdges, orderEvents } from "./types";

// Pop the next ready event, run its handler, schedule resulting emissions.
// Returns the new world. If no event is ready, advances tick to the next
// ready event (or returns world unchanged when fully quiescent).
export function step(spec: Spec, world: World): World {
  const idx = indexEdges(spec);
  const next: World = {
    ...world,
    state: { ...world.state },
    queue: [...world.queue],
    history: world.history,
    edgeOccupancy: { ...world.edgeOccupancy },
    edgePending: { ...world.edgePending },
    nodeBufferedEdges: { ...world.nodeBufferedEdges },
    edgeReleasePending: { ...world.edgeReleasePending },
    pendingSeeds: [...world.pendingSeeds],
  };

  if (next.queue.length === 0 && next.pendingSeeds.length === 0) {
    next.wasQuiescent = true;
    return next;
  }

  // If the queue is empty but pending seeds remain, advance tick to the
  // next pending-seed atTick so its scheduleEmission lands on a current
  // sim.tick (not in the past, not pre-due).
  if (next.queue.length === 0 && next.pendingSeeds.length > 0) {
    const nextAt = next.pendingSeeds[0].atTick ?? 0;
    if (nextAt > next.tick) next.tick = nextAt;
  } else {
    const head = next.queue[0];
    if (head.readyAt > next.tick) next.tick = head.readyAt;
  }

  // Drain pending seeds whose atTick has now arrived. Each goes through
  // scheduleEmission so the slot check happens at the correct moment — a
  // backpressured seed lands in edgePending like any other emission.
  while (next.pendingSeeds.length > 0 && (next.pendingSeeds[0].atTick ?? 0) <= next.tick) {
    const seed = next.pendingSeeds.shift()!;
    scheduleEmission(next, idx, seed.nodeId, seed.outPort, seed.value, seed.atTick ?? 0, 0);
  }
  next.queue.sort(orderEvents);

  if (next.queue.length === 0) {
    next.wasQuiescent = true;
    return next;
  }
  const head = next.queue.shift()!;

  const handler = getHandler(
    spec.nodes.find((n) => n.id === head.toNodeId)?.type ?? "",
    head.toPort,
  );
  if (!handler) {
    // No handler — silently absorb (e.g. dead-end ack on terminal
    // ChainInhibitor). Recurse to make progress on this tick.
    if (head.edgeId !== null) freeEdgeSlot(next, head.edgeId, spec, next.tick);
    next.wasQuiescent = false;
    return step(spec, next);
  }

  const prevState = next.state[head.toNodeId] ?? {};
  const props = resolveProps(spec, head.toNodeId);
  const result = handler(prevState, { port: head.toPort, value: head.value }, props);

  // Handler refused this input (e.g. ReadGate.chainIn before ack staged).
  // Re-queue the event one tick later, leaving state, slot occupancy, and
  // history untouched — the upstream source stays backpressured.
  if (result.decline) {
    next.queue.push({ ...head, readyAt: next.tick + 1 });
    next.queue.sort(orderEvents);
    next.wasQuiescent = false;
    return next;
  }

  next.state[head.toNodeId] = result.state;

  // Init-priming events have no visual pulse, so the view's anim-end
  // never fires for their slot — release here regardless of defer or it
  // leaks. Init MUST NOT touch nodeBufferedEdges: those entries belong to
  // upstream pulses that ARE animated, and freeing them here would cut
  // backpressure short and let two pulses share the same visual edge.
  if (head.fromInit && head.edgeId !== null) {
    freeEdgeSlot(next, head.edgeId, spec, next.tick);
  }
  if (result.emissions.length > 0) {
    if (!next.deferSlotFreeToView) {
      if (head.edgeId !== null && !head.fromInit) {
        freeEdgeSlot(next, head.edgeId, spec, next.tick);
      }
      const buffered = next.nodeBufferedEdges[head.toNodeId];
      if (buffered) {
        for (const eid of buffered) freeEdgeSlot(next, eid, spec, next.tick);
        delete next.nodeBufferedEdges[head.toNodeId];
      }
    } else {
      // Defer mode: mark each consumed edge. Slot frees only once the
      // matching anim-end has also fired.
      if (head.edgeId !== null && !head.fromInit) {
        noteEdgeConsumed(next, head.edgeId, spec, next.tick);
      }
      const buffered = next.nodeBufferedEdges[head.toNodeId];
      if (buffered) {
        for (const eid of buffered) noteEdgeConsumed(next, eid, spec, next.tick);
        delete next.nodeBufferedEdges[head.toNodeId];
      }
    }
  } else if (head.edgeId !== null && !head.fromInit) {
    const arr = next.nodeBufferedEdges[head.toNodeId] ?? [];
    arr.push(head.edgeId);
    next.nodeBufferedEdges[head.toNodeId] = arr;
  }

  for (const em of result.emissions) {
    scheduleEmission(next, idx, head.toNodeId, em.port, em.value, next.tick, em.delay ?? 1);
  }
  next.queue.sort(orderEvents);

  next.history = [
    ...next.history,
    {
      ord: next.nextOrd++,
      tick: next.tick,
      cycle: next.cycle,
      nodeId: head.toNodeId,
      inputPort: head.toPort,
      inputValue: head.value,
      inEdgeId: head.edgeId,
      emissions: result.emissions.map((e) => ({ port: e.port, value: e.value })),
    },
  ];

  // Cycle counter:
  //   (ii-b) anchor-fire — increment each time the anchor node fires.
  //   (ii-a) quiescent-input — increment when this step drained the queue.
  if (spec.cycleAnchor) {
    if (head.toNodeId === spec.cycleAnchor) next.cycle += 1;
  } else if (next.queue.length === 0 && next.pendingSeeds.length === 0) {
    next.cycle += 1;
  }
  next.wasQuiescent = next.queue.length === 0 && next.pendingSeeds.length === 0;
  return next;
}

// Drive simulator until pred(world) OR queue drains. Used by replayTo and
// by N2 step-debugger when user clicks "step until next fire on this node".
export function runUntil(
  spec: Spec,
  world: World,
  pred: (w: World) => boolean,
  maxSteps = 100_000,
): World {
  let cur = world;
  for (let i = 0; i < maxSteps; i++) {
    if (pred(cur)) return cur;
    if (cur.queue.length === 0 && cur.pendingSeeds.length === 0) return cur;
    cur = step(spec, cur);
  }
  throw new Error(
    `simulator.runUntil exceeded maxSteps=${maxSteps}; check for infinite loops`,
  );
}

// F1 deterministic replay: re-run cycle 0 → targetCycle silently from a
// fresh world. Cheap because handlers are pure.
export function replayTo(spec: Spec, targetCycle: number): World {
  return runUntil(spec, initWorld(spec), (w) => w.cycle >= targetCycle);
}

export function runToQuiescent(spec: Spec, world: World = initWorld(spec)): World {
  return runUntil(spec, world, (w) =>
    w.queue.length === 0 && w.pendingSeeds.length === 0 && w.tick > 0,
  );
}
