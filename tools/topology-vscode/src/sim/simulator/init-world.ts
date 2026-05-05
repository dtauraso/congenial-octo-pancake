import type { Spec } from "../../schema";
import { defaultSeed, readEdgeInit, readEdgeSlots } from "../seeds";
import { scheduleEmission } from "./schedule";
import { type SimEvent, type World, indexEdges, orderEvents } from "./types";

export function initWorld(spec: Spec): World {
  const world: World = {
    tick: 0,
    cycle: 0,
    wasQuiescent: true,
    state: {},
    queue: [],
    history: [],
    nextId: 0,
    nextOrd: 0,
    edgeOccupancy: {},
    edgePending: {},
    nodeBufferedEdges: {},
    pendingSeeds: [],
    deferSlotFreeToView: false,
    edgeReleasePending: {},
  };
  const idx = indexEdges(spec);
  // Explicit empty array means "seed nothing on purpose" — only fall back
  // to defaults when seed is undefined.
  const effective = spec.timing?.seed ?? defaultSeed(spec);
  for (const seed of effective) {
    const at = seed.atTick ?? 0;
    if (at > world.tick) {
      world.pendingSeeds.push(seed);
    } else {
      scheduleEmission(world, idx, seed.nodeId, seed.outPort, seed.value, at, 0);
    }
  }
  world.pendingSeeds.sort((a, b) => (a.atTick ?? 0) - (b.atTick ?? 0));
  // Edge channel priming: `edge.data.init: [v0, v1, ...]` mirrors Go's
  // `ch <- v0; ch <- v1` pre-loading. Lets a fully-running topology
  // re-enter its quiescent cycle from a cold start without a seed list.
  for (const e of spec.edges) {
    const init = readEdgeInit(e.data);
    const slots = readEdgeSlots(e.data);
    for (const v of init) {
      const ev: SimEvent = {
        id: world.nextId++,
        readyAt: 0,
        edgeId: e.id,
        fromNodeId: e.source,
        fromPort: e.sourceHandle,
        toNodeId: e.target,
        toPort: e.targetHandle,
        value: v,
        fromInit: true,
      };
      if ((world.edgeOccupancy[e.id] ?? 0) >= slots) {
        const arr = world.edgePending[e.id] ?? [];
        arr.push(ev);
        world.edgePending[e.id] = arr;
      } else {
        world.queue.push(ev);
        world.edgeOccupancy[e.id] = (world.edgeOccupancy[e.id] ?? 0) + 1;
      }
    }
  }
  world.queue.sort(orderEvents);
  return world;
}
