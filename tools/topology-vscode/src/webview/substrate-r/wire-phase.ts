// Wire phase reducer. The substrate's wire state machine, expressed as
// a pure reducer so it can be held in React state by <Wire>.
//
// Phases: empty | loaded(v) | taken(v). Ordinal: loaded happens, then
// taken, then back to empty. The model permits only these transitions:
//   empty  -> load  -> loaded(v)
//   loaded -> take  -> taken(v)
//   taken  -> ack   -> empty
// Any other transition throws. The throw on load-while-non-empty is the
// "send-on-non-empty" rule from the slot contract.

export type Phase =
  | { kind: "empty" }
  | { kind: "loaded"; value: unknown }
  | { kind: "taken"; value: unknown };

export type Action =
  | { type: "load"; value: unknown }
  | { type: "take" }
  | { type: "ack" };

export const initialPhase: Phase = { kind: "empty" };

export function wirePhaseReducer(p: Phase, a: Action): Phase {
  switch (a.type) {
    case "load":
      if (p.kind !== "empty") {
        throw new Error(`wire: load while ${p.kind}`);
      }
      return { kind: "loaded", value: a.value };
    case "take":
      if (p.kind !== "loaded") {
        throw new Error(`wire: take while ${p.kind}`);
      }
      return { kind: "taken", value: p.value };
    case "ack":
      if (p.kind !== "taken") {
        throw new Error(`wire: ack while ${p.kind}`);
      }
      return { kind: "empty" };
  }
}
