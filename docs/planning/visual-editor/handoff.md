# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit. Spec has been re-framed: wire-as-entity,
     not inbox-deferral. Read carefully — this reverses the prior
     cheap-fix framing.
  2. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  3. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, forty-sixth session):
  Active branch: `task/node-ticks`. Steps 1–5 of the substrate
  iteration plan landed. Step 5:
  `src/recorder/recorder.ts` — leaf event log over
  `WireEvent | NodeEvent`. Independent second subscriber alongside
  the step-4 renderer adapter; appends in arrival order, exposes
  `snapshot()` (copy) / `length` / `clear` / `stop`. No pacing, no
  DOM. Lives outside `src/substrate/` for the same reason the
  adapter does. Recorder + adapter + substrate emitters compose via
  a fan-out callback (see end-to-end test). Vocab + LOC clean; the
  contract suite shows only the two pre-existing reds. All five
  substrate/renderer/recorder modules are leaf — no production
  callers.

  **Friction this session:** legacy ticked path lets Step put >1
  pulse on a wire. Wiring the editor through steps 1–4 makes this
  impossible by construction (wire-entity throws on load-non-empty)
  — motivating example for option-2 integration. Do NOT cap
  `Pulse[]` in the legacy renderer as a cheap fix.

  **Model:** see `handoff-substrate-iteration.md`. Forever-loops per
  node and per wire; backpressure coordination; line-level pause;
  ordinal-seq state-change events; renderer owns pacing. Substrate
  is **timing-free** per MODEL.md. Runtime.ts port unblocked.

  **Held:** halt/resume on substrate; legacy is a working museum
  (`LEGACY_SKIP`); send-on-non-empty throws; renderer adapter stays
  outside `src/substrate/`.

  Pre-existing reds (not blocking): `shape-d-cycle.test.ts`,
  `handle-load-repro.test.ts`. Shape D self-pumps via `fb56c30`'s
  i1 fan-out + one-shot `seedLoop`. Manual-ack:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `topology.json`, `topology.view.json` — editor
  state, not committed. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

Read [MODEL.md](../../../MODEL.md) and
[handoff-substrate-iteration.md](handoff-substrate-iteration.md).
Steps 1–5 done. Next move: Option-2 integration — host-side shim
that runs the substrate in the extension host, pipes events through
the step-4 adapter (and into the step-5 recorder for replay/repro),
forwards paced frames to the webview as a dumb renderer. Bigger
commit; addresses the multi-pulse friction logged above. See
[handoff-next-task.md](handoff-next-task.md).

Dormant: triage pre-existing reds (`shape-d-cycle`,
`handle-load-repro`); Shape D port. Tick-batching audit superseded.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
