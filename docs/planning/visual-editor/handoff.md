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

**Active branch:** `main`, clean against `origin/main` (all work
pushed). No task branch in flight.

`InhibitRightGate` is landed and working in the live editor — pulses
flow through the cascade with the lateral inhibit edges in place.

## What was done this session

- **R5 dropped** from carried items. `app.tsx` is fully decomposed
  (`app/_*` hooks + `AppView`); the legacy `bridge.ts` coupling that
  R5 was watching for is gone post-React-migration. No action needed.
- **InhibitRightGate test follow-up dropped** at user direction —
  the gate is working live; tests deferred indefinitely.
- **`readNew` schema entry removed** from ChainInhibitor
  (`node-types.ts`). Was declared as a third output but
  `NODE_KIND_PORTS` and the body never had it — latent
  schema/runtime divergence. Re-add when a topology actually
  needs the new-arrival pulse.

## Resolved sign-off decisions (recorded for future kinds)

- **R1 — KindBodyCtx shape:** named map `outWireRefs:
  Record<string, RefObject<WireHandle|null>>`, keyed by output port
  name from `NODE_KIND_PORTS`. Scales to N outputs without
  positional fragility; symmetric with input slots (which are
  already name-addressed).
- **R2 — fire-on-L-alone:** correct INHIBIT semantics. When `left`
  fills and `right` stays empty, the gate emits.
- **R3 — sourceHandle name:** edges from i0/i1 to inhibitRight0 use
  `sourceHandle: "inhibitOut"`.
- **Multi-output firing semantics (ChainInhibitor):** **(A) lockstep
  fan-out.** Both `out.canAccept` AND `inhibitOut.canAccept`
  required before firing; one consume, two loads of the same value.
  Rationale: lateral inhibit must arrive in the same round as the
  chain pulse so InhibitRightGate's R slot is in the expected
  phase. (B) opportunistic side-fan would silently drop inhibits.

## The model (settled — unchanged)

- **No tick.** No tick counter, no tick concept.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger.
- **Running ≠ emitting.** `run()` is a handler; pulsing out depends
  on local preconditions.

## Next move

No queued task. No open follow-ups. Wait for the user to name the
next frame.

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

- `main` — production trunk; only active branch.

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
