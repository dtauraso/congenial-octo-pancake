# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/pulse-leak-investigation`
(pushed, c19ceb6). Working tree clean.

State at handoff:
  Two task branches landed to main this session:
  - `task/view-load-race-guard` (merged ee04532) — gates view-save
    until view-load completes; was destroying topology.json +
    topology.view.json on every editor open.
  - `task/runner-stuck-probe-ui` (merged d843036) — toolbar probe
    that surfaces runner stuck-pending / stuck-anim states with
    per-edge breakdown. Permanently latched once stuck so the
    label can be selected/copied.

  npm test → 200/200 pass. tsc clean. check:loc clean.
  go build / go test ./... → clean.

Active investigation (this branch):
  Pulse animation leak. Pulses run for a while, then stop and
  don't restart. Diagnosed via the new RunnerProbe as bug B
  (stuck-anim, Contract C4 regression). Captured user-visible
  data:

    ⚠ stuck-anim: 5 [
      i0.out->i1.in,
      i0.inhibitOut->inhibitRight0.left,
      i1.out->readGate.ack,
      i1.inhibitOut->inhibitRight0.right,
      in0.out->readGate.chainIn
    ]

  5 of 6 edges leak exactly 1 pulse each per stall. Only
  `readGate.out->i0.in` is never in the leaked set. Each pulse
  starts (noteEdgePulseStarted increments activeAnimations) but
  the rAF completion path (makeFrame's localT >= 1 → onComplete →
  parent advanceLane → React unmount → noteEdgePulseEnded) never
  fires for the leaked pulses.

  Full hypothesis + investigation plan in
  [session-log.md](session-log.md) under the 2026-05-05 entry
  "pulse animation leak: 5 of 6 edges stuck per cycle".

  **Next steps to take on this branch (not yet done):**
  1. Instrument [PulseInstance.tsx](../../tools/topology-vscode/src/webview/rf/AnimatedEdge/PulseInstance.tsx)
     and [_pulse-frame.ts](../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_pulse-frame.ts)
     to log first 30s of each pulse's localT progression. See
     whether stuck pulses freeze at a particular localT value.
  2. Check whether stuck pulses' `swapStart` is captured before
     vs. after the runner's `state.simSegmentStartWall` reset
     (clock-vs-arc mismatch hypothesis).
  3. Check whether geom changes mid-flight on those edges (e.g.
     fold collapse causing a re-route).
  4. Verify Contract C4 test pins what it claims to — the
     regression may be in a path the test doesn't cover (likely
     the geom-rerun branch in PulseInstance, since the bug is
     systematic across edges).

  **Why the leak likely involves the geom-rerun branch:** the
  PulseInstance has two effects — `[geom, speedPxPerMs]` for the
  rAF loop, and `[edgeId]` for the noteEdgePulseStarted/Ended
  bridge. Contract C4 pins the bridge balance per mount lifetime.
  If something causes geom to keep changing in a way that throws
  during the rAF effect's setup, the bridge effect's mount fired
  but the pulse never completes via onDone — leaving the parent's
  pulses0/pulses1 array stuck and the PulseInstance mounted.

Contract registry status (docs/planning/visual-editor/contracts.md):
  C1 ✅ ready-once + ready-once-hook (Tier 1+2)
  C2 ✅ spec-data-roundtrip
  C3 ✅ view-load-setviewport
  C4 ⚠ pulse-bridge-balance — passes in test, regresses in prod;
     test does not exercise the path that's leaking
  C5 ✅ stuck-pending-precondition

Open branches (pushed, unmerged):
  - task/pulse-leak-investigation (this branch, c19ceb6)

Other recommended branches (dormant, not started):
  - visualize-gate-buffer-state
  - backpressure-slack-envelope
  - stepping-semantics-doc

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
