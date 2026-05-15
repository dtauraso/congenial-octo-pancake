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

**Active branch:** `main`. No task branch in flight.

`topology.json` is back to the 4-node chain (`in08`, `readGate1`,
`i0`, `i1`) — a stray `join1` node + 2 edges from a prior session
were removed this session. 111/111 vitest green, tsc clean.

## What was done this session

- **Identified the 5th node** the user wants to add: `InhibitRightGate`
  (`inhibitRight0` in the cascade), role `inhibit-right-gate`,
  INHIBIT(L=1, R=0). Source of truth:
  [diagrams/topology-chain-cascade.svg](../../../diagrams/topology-chain-cascade.svg).
- **Wrote a landing plan** at
  [plan-inhibit-right-gate.md](plan-inhibit-right-gate.md) with three
  sibling SVG diagrams (topology before/after, file-level dispatch
  map, slot-phase firing trace).
- **Reverted** stray `join1` work from `topology.json`. View file had
  no `join1` entry.

## The model (settled — unchanged)

- **No tick.** No tick counter, no tick concept.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger.
- **Running ≠ emitting.** `run()` is a handler; pulsing out depends
  on local preconditions.

## Next move

Implement `InhibitRightGate` per
[plan-inhibit-right-gate.md](plan-inhibit-right-gate.md). The plan
covers: `spec.ts` registration, new concept-bounded
`substrate-r/inhibit-right-gate.tsx`, `renderKindBody` case,
`ChainInhibitor` second-output handle, and `topology.json` +
`topology.view.json` additions for `inhibitRight0`.

**One open judgment call** before writing code (see plan §Risks):
`ChainInhibitorBody` currently holds one `outWireRef`. Threading a
second ref for the `inhibitOut` fan-out requires deciding whether
`KindBodyCtx.outWireRef` becomes an array, a named map, or a second
named field. Resolve with David before the substrate edit lands.

## Carried items (still open)

- R5 (watch-only): `app.tsx` coupling.

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
