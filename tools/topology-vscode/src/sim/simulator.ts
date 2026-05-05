// Pure event-stepping simulator. Given (spec, world), `step(world)` pops
// the oldest in-flight event whose delay has expired, runs the receiver's
// handler, schedules emissions, and returns the new world. Independent of
// the renderer — the runner wraps this in a wall-clock interval and emits
// events to the EventBus.
//
// Determinism: events are tagged with a monotonically-increasing arrival
// id at schedule time. When multiple events are ready in the same tick,
// the lowest arrival id wins. Two simulators given identical specs +
// identical seed events produce identical event sequences.

export type { SimEvent, FireRecord, World } from "./simulator/types";
export { initWorld } from "./simulator/init-world";
export { step, runUntil, replayTo, runToQuiescent } from "./simulator/step";
export { enqueueEmission, makeSeed, getPendingCount } from "./simulator/_utils";

// Re-export for callers that import from "./simulator".
export {
  defaultSeed,
  readEdgeDelay,
  readEdgeInit,
  readEdgeSlots,
  readNodeInit,
} from "./seeds";
export {
  freeEdgeSlot,
  noteEdgeAnimEnded,
  noteEdgeConsumed,
} from "./slot-release";
export { HANDLERS, getHandler } from "./handlers";
