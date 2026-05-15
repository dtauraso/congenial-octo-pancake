# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget (per CLAUDE.md "File
size budget"): a fresh AI session must read it end-to-end, and audit
19 found that splitting it across siblings cost more reading time
than keeping one slightly-larger doc.

---

## State at handoff (2026-05-14, end-of-session)

**Active branch:** `task/formalize-control-flow-timing`, pushed to
origin. Not merged.

Two of the three additions from `partitioned-launching-fog.md` § "Three
additions needed to formalize what's already present" landed; one was
proposed, implemented, then rejected and reverted on user feedback.

Commits on the branch (newest first):

- `cafdcc7` — revert per-wire speed (see decision below)
- `9bea44c` — feat: fan-out convergence observable event
- `33093ca` — feat: per-wire speed prop (reverted by cafdcc7; kept in history)
- `1e8eeff` — docs: reframe arcLength:0 as visible-duration collapse

All 125 contract tests still green; `npm run build` clean.

## Decision recorded this session: pulse speed is uniform

The analysis doc's §6 argued per-wire `speed` on `RWireSpec` was "the
strongest single argument" for the control-flow model. Implemented in
33093ca, then rejected: **pulse speed must be the same for all wires.**
The control-flow model formalization stands without it. If a future
task implies heterogeneous timing (e.g., "inhibit arrives first"), the
mechanism is topology-level (shorter inhibit path, upstream wiring),
not a per-wire speed knob. See
`memory/feedback_uniform_pulse_speed.md`.

The §6 section of `partitioned-launching-fog.md` is now stale — the
argument it makes was tried and rejected. The rest of the doc is still
load-bearing for understanding the substrate's two-clock structure and
why fan-out convergence is the right primitive.

## What landed (the two surviving additions)

- **Fan-out convergence observable event** (`9bea44c`): wire-pair
  coordinator `subscribeFanoutConvergence` in
  `substrate-r/fanout-convergence.ts`. Subscribes to both wires of a
  fan-out via existing `subscribePhase` interface; fires callback
  once both have completed a paired delivery round. Chose coordinator
  over new node kind to avoid `parseSpec`/`node-kinds.tsx`/`RNodeKind`
  churn for what is a pure observability primitive. Makes C1-class
  exclusion contracts expressible as control-flow events.
- **arcLength:0 doc reframe** (`1e8eeff`): comments in
  `test/contracts/_fixtures.ts` and `r-topology-smoke.test.tsx`
  reframed from "bypass animation" to "collapse visible duration but
  preserve control-flow event ordering." Test runtime behavior
  unchanged. Other test files left for the sequenced migration step.

## The model (settled — unchanged)

- **No tick.** No tick counter, no tick concept.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger.
- **Running ≠ emitting.** `run()` is a handler; pulsing out depends
  on local preconditions.

## Next move

Decision points for the user on `task/formalize-control-flow-timing`
before merge:

1. **Merge as-is to main?** Two additions landed cleanly (fan-out
   convergence helper + arcLength:0 doc reframe). Per-wire speed
   tried and reverted. The doc's planned sequence (1)→(2)→(3)→(4
   verify)→(5 test migration) collapses to (2)+(3); MODEL.md was not
   updated this session because the "name the firing rule" step the
   doc described was paired with per-wire speed.
2. **Does MODEL.md still need a firing-rule rename** absent per-wire
   speed? The substrate is already control-flow-paced; the rename
   was motivated mainly by §6. Worth user judgment whether it earns
   its own commit.
3. **Update `partitioned-launching-fog.md`** to strike §6 and revise
   the Recommendation section, or leave it as a historical record
   of an argument that was tried and didn't survive contact?
4. **Sequenced test migration** (step 5 of the doc's plan) is still
   available as a follow-up frame. The fan-out convergence helper is
   not yet consumed by C1 — a future task could use it to tighten
   C1's weakened contract.

C1 single-winner exclusion remains **accepted as weakened contract**
from the prior session; revisit only if a future task needs true
mutual exclusion.

## Carried items (still open)

(none)

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** No center exists.
- **canAccept IS the trigger.** No scheduler, no walker, no clock.
- **Running ≠ emitting.** Sources can run and decline to pulse.
- **Concept-bounded code, not layer-bounded.**

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user to
  name the next frame.
- When designing fixes, first ask: what does the Go side do?
- Delegate executor work to haiku/sonnet subagents; reserve main
  Opus session for judgment.
- **Don't pause for sign-off when the user has already said go.** This
  session lost a turn asking permission after "do the named map." If
  the frame is named and decisions are recorded, just execute.

See `memory/feedback_substrate_vs_coordinator_bias.md` and
`memory/feedback_visual_first_default.md`.

## Open branches

- `main` — production trunk.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

After any substrate-r edit, run `npm run build` — vitest/tsc alone
don't refresh `out/webview.js` (stop-hook does, but only when bundled
TS changed and output is older than input).

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/`.

## ALWAYS clause

At end of session, overwrite this file with a freshly-rendered
prompt tailored to the state you're leaving the branch in, and
commit on the active branch (main if no task is in flight). Do not
rely on chat history; the next AI may be a fresh model with no
transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes.
