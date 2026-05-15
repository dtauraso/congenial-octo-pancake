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

**Active branch:** `main`. All task branches merged and deleted.

Recent commit landed:

- `remove ⌫ button from ReadGateBody; expose node handles via TopologyRoot ref` (395a2a9)

111/111 vitest green, tsc clean on main.

## What was done this session

- **Removed the ⌫ button from `ReadGateBody`:** The button was a
  manual drain escape hatch for the no-out-wire case. `run()` never
  depended on it; it only drove `armed` display state. Removed the
  button, `onConsume`, `phases` state, and the slot subscription
  machinery — all dead code once the button is gone.

- **Exposed node handles from `TopologyRoot`:** Added
  `TopologyRootHandle` interface with `node(id): NodeHandle | null`.
  `TopologyRoot` is now a `forwardRef` component. Tests that previously
  used `data-armed` on the button as a slot-phase proxy now call
  `slotPhase()` directly through the ref.

- **Rewrote five contract tests** to use the ref rather than button
  DOM attributes: smoke, chain, join, readgate-emit, readgate-port.

## The model (settled — unchanged)

- **No tick.** No tick counter, no tick concept on driver, nodes, or edges.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger. No driver poll, no round walk.
- **Running ≠ emitting.** `run()` is a handler that may or may not
  pulse out depending on local preconditions.
- **`useHaltControl`** is a halt-control, not a coordinator.

## Carried items (still open)

- R5 (watch-only): `app.tsx` coupling.

## Next move

No task branch in flight. Drive from session-log friction as usual.

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** No center exists.
- **canAccept IS the trigger.** Wire-empty + dest-slot-empty invokes
  `run()`. No scheduler, no walker, no clock.
- **Running ≠ emitting.** Sources can run and decline to pulse.
- **Concept-bounded code, not layer-bounded.**

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user to
  name the next frame.
- When designing fixes, first ask: what does the Go side do?
- Use Claude Code as a fabricator, not a co-designer.

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
