## 2026-05-10 — readgate-ack-button torn out: gating must be schema-enforced

**Observation:** With minimal topology `in08 (Input) → readGate1
(ReadGate) on chainIn`, Input pulses cycle forever. User expected the
"slot" (chainIn wire's `loaded` phase) to fill and Input to
backpressure until something clears it.

**Hypothesis / scope:** ReadGate's schema declares two inputs
(`chainIn` and `ack`). `runNode` parks on `awaitAll(awaitLoaded)`
over inputs **built from spec edges**, not from declared ports. With
only `chainIn` wired, runNode treats ReadGate as a one-input node:
takes chainIn immediately, loops, Input keeps emitting. The gating
the user expected only exists if `ack` is wired.

**Decision:** Branch `task/readgate-ack-button`. Added a new `Button`
node type (zero inputs, one output, awaits manual `fire()` instead of
a seed queue), wired `btn1 → readGate1.ack`, plumbed a `fire-button`
webview→host message through to a new `runFrames.fireButton(nodeId)`
handle, made the Button node clickable in the webview. All gates
green; gating worked while wired.

**Outcome:** Torn out and branch deleted (local + remote). The fix
ran in the right direction (no substrate change needed — the wire's
three-phase state machine and `awaitAll(awaitLoaded)` already do the
gating) but the design silently regressed the moment a user deleted
btn1 or its edge: parseSpec accepts a ReadGate with no ack wire,
runNode falls back to one-input behavior, pulses flood again. No
error, no warning. User called it "the stupidest and most fragile
thing it can possibly do."

**Lesson saved:** `memory/feedback_enforce_required_inputs.md` — when
a node type's correctness depends on an input being wired, mark it
required at the schema and fail parseSpec if missing. Don't ship the
gating without the validation.

**Next task (handoff-next-task.md):** schema-level required-input
enforcement. Add `required?: boolean` to Port; mark `ReadGate.ack`
required; validate in parseSpec; update the spec to satisfy the
constraint. Button / manual-ack UX is parked, not killed — revisit
once enforcement is in.
