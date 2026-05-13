// Wire phase reducer. Under the slot-in-node model the wire is
// transient: a value enters at load, transits while in-flight, and
// disappears from the wire on arrive (the value is written into the
// destination node's slot, not parked on the wire).
//
//   empty       -> load   -> in-flight(v)
//   in-flight   -> arrive -> empty
//
// Load on a non-empty wire throws (send-on-non-empty). Source nodes
// must consult dest.slotPhase + wire.phase before loading.

export type Phase =
  | { kind: "empty" }
  | { kind: "in-flight"; value: unknown };

export type Action =
  | { type: "load"; value: unknown }
  | { type: "arrive" };

export const initialPhase: Phase = { kind: "empty" };

export function wirePhaseReducer(p: Phase, a: Action): Phase {
  switch (a.type) {
    case "load":
      if (p.kind !== "empty") {
        throw new Error(`wire: load while ${p.kind}`);
      }
      return { kind: "in-flight", value: a.value };
    case "arrive":
      if (p.kind !== "in-flight") {
        throw new Error(`wire: arrive while ${p.kind}`);
      }
      return { kind: "empty" };
  }
}
