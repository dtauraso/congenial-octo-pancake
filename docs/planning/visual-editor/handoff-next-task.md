# Handoff — Next task (START HERE)

**Step-1 follow-up: fix the play/pause toolbar button under the
substrate path.** The button currently calls into `sim/runner`'s
`play()`/`pause()`. Step 1 hijacks `legacyRunnerState.playing` and
calls `pauseRunner()` on substrate-match, so the toolbar button now
either no-ops (no spec loaded in legacy runner) or fights the
substrate's own state.

Note (post-d2f36c1): the substrate is now ack-driven, so "pause"
means *don't emit the next token on receipt of the next ack*, and
*also halt the in-flight pulse animation*. Pausing the in-flight
pulse may need to plug into the existing `pauseAllPulseTimers` /
`resumeAllPulseTimers` (sim/runner/pulse-completion) so the visible
arc freezes. This is shoe-horn-able into option (b) below.

**Surfaced friction (2026-05-07):** user reports "play/pause has a
new bug" after step 1 wire-animation fix landed. Tokens animate
correctly in auto-run, but the toolbar control is broken. Logging
this here per the post-v0 friction-driven posture (CLAUDE.md).

What "fixed" looks like:
  - With the 2-node topology loaded, pressing pause halts token
    emission AND halts the in-flight pulse animation.
  - Pressing play resumes both.
  - Reset (existing behavior) re-arms the input queue.
  - Behavior should match the chan-wire.html sketch's intuition.

Concrete scope candidates (Opus call, then sonnet edits):
  (a) Make substrate own its own play/pause flag. Toolbar reads
      from substrate when matched, legacy runner otherwise.
      Decoupling move — likely correct but bigger.
  (b) Have substrate mirror its play state into
      `legacyRunnerState.playing` (already half-doing this) and
      route toolbar's play/pause through a thin shim that toggles
      both substrate's setInterval AND the flag. Smaller, keeps
      step-1 hack shape.
  (c) Defer play/pause until step 3's R1 contract test forces a
      cleaner animation contract. Skip for now.

Recommendation: (b) for this commit (cheapest, preserves the
gated-hacks discipline in step 1 build notes), upgrade to (a) at
step 3 when the substrate contract is being written anyway.

Budget: ~$10. Same hard cap and reassess discipline (below).

After this lands, then port-plan step 2 (per-node running indicator
+ reloop glyph). Spec at
[../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
§"Visual layer" item 2. Do not start it before play/pause works —
the running indicator needs play/pause to be debuggable.

Do **not** combine the play/pause fix with step 2 in one commit.
One concern per commit per the plan doc.

## Hard cap and reassess trigger (carried forward from step 1)

Each port-plan step gets a per-step hard cap (default $25 unless
stated otherwise). If a step has not produced its working
deliverable by the cap, stop and reassess: write a one-paragraph
note in [../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md)
naming which assumption broke (renderer location? buffered model?
topology shape? something else?), and surface to the user before
spending more. The point is to find substrate-design problems
cheaply at the current step rather than later after more code has
piled on top. Sunk-cost reasoning is the failure mode this cap
defends against — do not raise the cap mid-spiral without explicit
user sign-off.
