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

**Active branch:** `task/self-scheduling-nodes`. The driver rewrite is
complete. Commits in:

- `854359f` — trace-logging precursor
- `4508bdc` — InputBody subscribes to outWire canAccept
- `04e861e` — strip tick/step driver; nodes fire on their own triggers

111/111 vitest green, tsc clean, vocab clean at branch tip.

## What was done this session

Stages 1–5 of the rewrite:

1. **InputBody self-subscription** (4508bdc): subscribes to
   `outWire.canAccept`; fires `run()` once on mount.
2. **Driver stripped** (04e861e): `useTickDriver` deleted; replaced by
   `useDriver` (halt/resume/pauseAxis only, no walker, no tick, no
   step). `registry.tsx` and `TopologyRoot.tsx` updated.
3. **UI cleanup** (04e861e): step button removed from
   `TransportControls.tsx`; tick span removed from `TopologyRoot.tsx`.
4. **Tests rewritten** (04e861e): `r-tick-driver.test.tsx` deleted;
   replaced by `r-driver.test.tsx` (halt/resume/pauseAxis contract).
   Topology integration tests rewritten to assert on wire/slot phase
   instead of tick value. `haltedOnMount` removed from test renders.
5. **Vocab check** (04e861e): "self-schedule" and "pulse-arrival"
   comments fixed. Vocab clean.

## The model (settled last session — unchanged)

- **No tick.** No tick counter, no tick concept on driver, nodes, or
  edges.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger. No driver poll, no round walk.
- **Running ≠ emitting.** `run()` is a handler that may or may not
  pulse out depending on local preconditions.
- **`useDriver`** exists solely to implement the user-facing halt/resume
  toggle. It is a halt-control, not a coordinator. The name "driver" is
  a misnomer; a rename to `useHaltControl` was noted but not done.

## Next move — Stage 6: verify the original bug

The motivating bug: in0's emission cadence was coupled to peer-source
pulse arrival via the global round-close. With the round-close gone,
in0 should fire as soon as `readGate.chainIn` transitions to empty —
regardless of where the i1→chainIn2 pulse is.

Reproduce the topology in
[topology.json](../../../topology.json), run the editor, inspect
`.probe/webview-log.jsonl`. Expected: `trace.input.fire` for in0
appears within microseconds of `trace.consume` on readGate.chainIn,
not after the i1→chainIn2 delivery.

## Carried items (still open)

- R4: substrate-up-the-stack import in `RSubstrateEdge.tsx`
  (`dashForKind`, `markerEndUrl` from `../rf/`).
- R5 (watch-only): `app.tsx` coupling.
- Retire `ChainInhibitor`'s `⇢` debug button — not a source, should
  not have source powers. Self-scheduling rewrite is the right moment:
  ChainInhibitor's `run()` is triggered by slot fill; the manual emit
  button has no place.
- `useDriver` rename to `useHaltControl` — noted, not done.
- `task/in0-readgate-emission-ack` parked, auto-retire signal hit,
  awaiting deletion sign-off.

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** No center exists. The tick/step
  was a coordinator; it is gone.
- **canAccept IS the trigger.** Wire-empty + dest-slot-empty on an
  adjacent wire is what invokes `run()`. No scheduler. No walker. No
  clock.
- **Running ≠ emitting.** Sources can run (canAccept fires) and decline
  to pulse (queue empty). Consumers can run (input arrives) and decline
  to pulse (out wire blocked, AND-gate not satisfied).
- **Concept-bounded code, not layer-bounded.** substrate-r/ files are
  one per model concept.

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user to
  name the next frame.
- When designing fixes, first ask: what does the Go side do?
- Use Claude Code as a fabricator, not a co-designer.

See `memory/feedback_substrate_vs_coordinator_bias.md` and
`memory/feedback_visual_first_default.md`.

## Open branches

- `main` — production trunk.
- `task/substrate-slot-in-node` — concept-bounded refactor landed;
  parent of the current branch. Eligible for merge to main once
  self-scheduling work concludes.
- `task/self-scheduling-nodes` — this branch.
- `task/in0-readgate-emission-ack` — parked, deletion needs sign-off.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

Read [MODEL.md](../../../MODEL.md) and
[useDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useDriver.ts)
(the halt-control; soon to be renamed). After any substrate-r edit,
run `npm run build` — vitest/tsc alone don't refresh `out/webview.js`
(stop-hook does, but only when bundled TS changed and output is older
than input).

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
