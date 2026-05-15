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

## State at handoff (2026-05-14, post-merge)

**Active branch:** `main` — no task branch in flight.

`task/formalize-control-flow-timing` merged to main at `c485461`
and was deleted. All 125 tests green; build clean.

## What landed (task/formalize-control-flow-timing)

- `1e8eeff` — docs: reframe arcLength:0 as visible-duration collapse
  in test fixtures
- `9bea44c` — feat: fan-out convergence observable event
  (`subscribeFanoutConvergence` in `substrate-r/fanout-convergence.ts`)
- `cafdcc7` — revert per-wire speed (tried and rejected; see decision below)
- `6f8fef1` — docs(model): name firing rule as control-flow event in MODEL.md
- `01bdfaf` — docs(planning): mark §6 of `partitioned-launching-fog.md`
  as tried-and-rejected; "Three additions" list updated

## Decision recorded: pulse speed is uniform

Per-wire `speed` on `RWireSpec` was implemented and immediately
reverted on user feedback. Pulse speed is uniform across all wires.
If future work implies heterogeneous timing (e.g., inhibit arrives
first), the mechanism is topology-level (shorter path, upstream
wiring), not a per-wire knob. See `memory/feedback_uniform_pulse_speed.md`.

## The model (settled)

- **No tick.** No tick counter, no tick concept.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger — this is the named control-flow event.
- **Running ≠ emitting.** `run()` is a handler; pulsing out depends
  on local preconditions.

## Open items

- `subscribeFanoutConvergence` is not yet consumed by C1 — a future
  task could use it to tighten C1's weakened single-winner exclusion
  contract.
- C1 single-winner exclusion remains accepted as a weakened contract
  from a prior session; revisit only if a future task needs true
  mutual exclusion.

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
- Don't pause for sign-off when the user has already said go.

## Open branches

- `main` — production trunk, active.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

After any substrate-r edit, run `npm run build` — vitest/tsc alone
don't refresh `out/webview.js`.

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
