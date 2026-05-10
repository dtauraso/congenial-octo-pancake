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

State at handoff (2026-05-10, forty-seventh session):
  Active branch: `task/node-ticks`. Steps 1–5 of the substrate
  iteration plan landed; Option-2 integration has begun with
  step 6: `src/host-shim/host-shim.ts` — leaf composition module
  that combines wires + uniform node loops + step-4 adapter +
  step-5 recorder via two independent subscriptions and derives
  `PacedFrame` snapshots. Frame schema (decided this session):
  per-wire `empty | carrying(value)` and per-node
  `parked-input | running | parked-output | parked-ack`. Carried
  values are sampled at event-emit time so the snapshot survives
  later wire transitions. Contract test at
  `test/contracts/host-shim.test.ts` (4 tests) pins frame
  derivation, two-subscription independence, and end-to-end seq
  ordering. Vocab + LOC clean; suite shows only the two
  pre-existing reds. Six leaf modules now — no production callers.

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
Steps 1–5 done; step 6 (host-shim leaf composition) landed. Next
move: step 7 — wire the shim into the extension host. Run the
substrate in the host, register the adapter + recorder via
`composeShim()`, and forward `PacedFrame` payloads to the webview
over the existing message bus as a new `frame` host→webview
message. Webview becomes a dumb renderer that paints frames. Adds
`PacedFrame` to `messages.ts`; chooses a strategy for the legacy
ticked path (coexist behind a flag, or retire). See
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
