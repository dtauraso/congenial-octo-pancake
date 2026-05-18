---
name: feedback-readgate-partial-0-is-spec
description: "Superseded 2026-05-17: ReadGate's partial-0 emit was removed by user direction. ReadGate now fires only on all-filled and passes through slots[0]."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 00f7eac8-ab0c-48b6-b7e1-6d965eb68864
---

**Superseded 2026-05-17.** The partial-0 emit branch has been removed from `ReadGateBody`.

The current spec is one rule:
- All N slots filled AND out-wire canAccept → consume all, `wire.load(slots[0])` (primary slot's value flows through; not synthesised 1).

**Why the change:** While the partial-0 rule was internally consistent, in the live edge-detector topology it pumped synthetic 0s into the input stream upstream of the ChainInhibitor shift register. Combined with unequal wire travel times, those synthetic 0s clobbered real input values — so the window that InhibitRightGate saw contained values that were never inputs. User directed: "remove the partial output ReadGate is doing. It needs to only send the [primary] when all the input slots are full." (Session 2026-05-17.)

**How to apply:** Do not re-introduce the `else { wire.load(0) }` branch. The associated `r-topology-readgate-partial.test.tsx` file was deleted in the same commit; do not restore it. Ring startup is now broken without an explicit seed pulse — see [[feedback-edge-seed-required-for-rings]] for that constraint.
