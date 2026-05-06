# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

---

Continuing on wirefold, branch `task/pulse-animation-abstraction`
(pushed, 4d4ae63). Working tree clean.

State at handoff:
  Branched off `task/pulse-leak-investigation`. The root cause from
  that branch was diagnosed and fixed:

  **Bug fixed (cycle-livelock under fold suppression):** the
  `deferSlotFreeToView` slot release machinery required
  `noteEdgeAnimEnded` to fire on every emitted pulse, but the
  bridge that called it lived inside `PulseInstance.tsx`. When the
  fold-halo collapsed `readGate1`'s edges, no `<AnimatedEdge>` /
  `<PulseInstance>` mounted for them, the bridge never fired,
  `edgeReleasePending.animEnded` stayed false forever, and the
  `in0->readGate.chainIn` slot was held indefinitely. ChainIn
  declined every step waiting for an ack that couldn't arrive
  (i1's ack pulse was queued behind the held slot). cycle stayed
  at 1.

  **Fix:** lift pulse lifecycle ownership out of the React
  component into a runner-layer module
  ([src/sim/runner/pulse-lifetimes.ts](../../tools/topology-vscode/src/sim/runner/pulse-lifetimes.ts))
  that subscribes to `notify({type:"emit"})` on the event bus and
  schedules `noteEdgePulseStarted` / `noteEdgePulseEnded` on its
  own clock (`PULSE_DEFAULT_DURATION_MS = 2000`). Installed at
  webview boot in
  [src/webview/main.tsx](../../tools/topology-vscode/src/webview/main.tsx).
  PulseInstance is now a pure renderer.

  Verified via three time-spaced probes
  (`.probe/stuck-pulse-last*.json`): cycle advances 5 → 7 → 13
  across the same 30s window where it previously froze at 1.

  Contracts updated:
  - **C6** (new, registered) — pulse-lifetime-view-agnostic. Pins
    that `notify(emit)` registers a balanced lifecycle regardless
    of whether any renderer is subscribed.
  - **C4** (inverted) — PulseInstance must NOT touch
    `activeAnimations`. Lifecycle ownership is now C6's.

  204/204 tests pass. tsc clean. check:loc clean. build clean.

**New bugs introduced by the fix (next session's work):**

The C6 design decouples lifecycle clock (2s default) from visual
duration (path arc / `pulseSpeedPxPerMs`). On slow edges the visual
takes ~10s while the simulator frees the slot every 2s and emits
new pulses. Two consequences captured in
`.probe/stuck-pulse-last-third.json` (May 5 19:17):

1. **Visual stacking on slow edges.** `i1.out->readGate.ack` had
   6 simultaneous `<PulseInstance>` components in dump 3 (IDs 49,
   54, 57, 64, 69, 72), each ~10s long. The diagram looks like
   dots spawning on top of each other on long-arc edges.

2. **Frame stall.** `msSinceLastFrame: 1615ms` for every active
   pulse in dump 3 (rAF should be ~16ms). The render loop is
   bogged down by N concurrent PulseInstances doing per-frame
   geometry math (label placement, dash offset, label opacity).

User accepted these trade-offs to fix the livelock; both should
be addressed before this lands on main. Three candidate
directions, listed in order of decreasing scope:

- **A. Renderer-authoritative completion when mounted.**
  Extend pulse-lifetimes so a renderer can register itself for an
  edge. If registered, the lifecycle waits for the renderer's
  signal (real arc-traversal time); if unregistered (folded /
  headless), the default-duration timer fires. Preserves visual
  fidelity AND fold correctness. Best long-term answer.

- **B. Per-edge concurrency cap in the renderer.** Cap visual
  pulse instances per edge to N (e.g. 1) by dropping/coalescing
  overflow in `<AnimatedEdge>`. Solves stacking and frame stall;
  doesn't address the simulator-vs-visual divergence on slow
  edges (the user still sees one slow pulse representing many
  simulator emissions).

- **C. Shorten the long arc routes.** The original option B from
  pulse-leak-investigation. Geometric fix to feedback-ack
  routing so all edges have comparable arc lengths. Doesn't
  generalize — any future long edge brings the bugs back.

Recommended split:
- New branch `task/pulse-renderer-authoritative` for A. Build
  on top of this branch (lifecycle still owned by pulse-lifetimes,
  but completion is "renderer-signals OR timer fallback, whichever
  fires first"). Add contract C7: "if a renderer signals completion
  before default duration, lifetime ends at signal; otherwise at
  timer."
- New branch `task/pulse-frame-stall-bound` for B as a defense in
  depth — even with A, a pathological case (many overlapping
  emissions before the renderer can complete) needs a cap.

Probe instrumentation (from pulse-leak-investigation, still active
on this branch):
  - `.probe/stuck-pulse-last.json` — at first stuck-anim moment.
  - `.probe/stuck-pulse-last-followup.json` — 1.5s later.
  - `.probe/stuck-pulse-last-third.json` — 30s later.
  - `RunnerProbe` toolbar latches `⚠ stuck-anim` / `⚠ stuck-pending`
    once tripped, with full pulse table in tooltip; auto-copies to
    clipboard; mirrored on `window.__pulseLeakDump`.
  - `window.__resetPulseLeak()` in console re-arms the one-shot.

Open branches (pushed, unmerged):
  - task/pulse-animation-abstraction (this branch, 4d4ae63)
  - task/pulse-leak-investigation (8a2369a — instrumentation only,
    no fix; can be deleted once this branch merges)

Other recommended branches (dormant, not started):
  - visualize-gate-buffer-state
  - backpressure-slack-envelope
  - stepping-semantics-doc

Branch hygiene: no merge to main without explicit sign-off. Delete merged branches without re-asking. Force-push needs sign-off.
Cwd for tsc/tests/check:loc/build: tools/topology-vscode/ (Bash resets cwd — chain cd or use absolute paths).
Stop hook now active: scripts/stop-checks.sh runs go build / tsc / check:loc on relevant changes and blocks stop on failure.
If user surfaces unrelated friction, log to docs/planning/visual-editor/session-log.md and open a fresh task/<short-kebab>.

ALWAYS — at end of session, overwrite docs/planning/visual-editor/handoff.md with a freshly-rendered prompt tailored to the state you're leaving the branch in, and commit it on the task branch. Do not rely on chat history; the next AI may be a fresh model with no transcript. The rendered handoff must itself contain this same ALWAYS clause so the loop is self-perpetuating across sessions. Use docs/planning/visual-editor/continuation-prompt-template.md as the structural source of truth; update the template when an invariant changes.
