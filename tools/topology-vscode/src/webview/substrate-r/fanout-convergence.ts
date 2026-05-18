// fanout-convergence: observable event that fires once both wires of a
// fan-out have delivered (transitioned in-flight → empty).
//
// Makes C1-class exclusion problems expressible as control-flow contracts:
// "both inhibit and data arrived at their destinations" is a single named
// event rather than two independent subscriptions glued by ad-hoc state.
//
// Usage:
//   const unsub = subscribeFanoutConvergence(wireA, wireB, () => {
//     // both wires delivered in this fan-out pairing
//   });
//   // call unsub() to unsubscribe
//
// The callback fires each time both wires complete a paired delivery.
// "Paired delivery" means: from the moment the first wire enters in-flight, the
// convergence fires once both have returned to empty. Concurrent fan-out loads (both wires
// in-flight simultaneously) also converge correctly — the callback fires when
// the slower wire arrives.

import type { WireHandle, Phase } from "./Wire";

export type ConvergenceUnsub = () => void;

// subscribeFanoutConvergence wires up phase listeners on both handles and
// fires onConverge when both have arrived (phase → empty) after at least one
// of them entered in-flight. Returns a cleanup function.
export function subscribeFanoutConvergence(
  wireA: WireHandle,
  wireB: WireHandle,
  onConverge: () => void,
): ConvergenceUnsub {
  // seenInFlight tracks whether each wire has entered in-flight since the
  // last convergence (or startup). Both must have been in-flight before the
  // convergence counts — prevents the callback from firing on the initial
  // empty state at mount.
  let aInFlight = false;
  let bInFlight = false;
  let aArrived = false;
  let bArrived = false;

  function check() {
    if (aInFlight && bInFlight && aArrived && bArrived) {
      // Reset for next pairing before calling out (re-entrant safety).
      aInFlight = false;
      bInFlight = false;
      aArrived = false;
      bArrived = false;
      onConverge();
    }
  }

  function listenerA(phase: Phase) {
    if (phase.kind === "in-flight") {
      aInFlight = true;
      aArrived = false;
    } else if (phase.kind === "empty" && aInFlight) {
      aArrived = true;
      check();
    }
  }

  function listenerB(phase: Phase) {
    if (phase.kind === "in-flight") {
      bInFlight = true;
      bArrived = false;
    } else if (phase.kind === "empty" && bInFlight) {
      bArrived = true;
      check();
    }
  }

  const unsubA = wireA.subscribePhase(listenerA);
  const unsubB = wireB.subscribePhase(listenerB);

  return () => { unsubA(); unsubB(); };
}
