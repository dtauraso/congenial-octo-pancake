# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-16)

**Active branch:** `task/pulse-secondary-value` — 9 commits ahead of main.
Animation is **working** on the live editor with the current topology.
Not yet merged. Do not merge without explicit sign-off.

## What's working

Latest substrate commit: `3815643 feat(chaininhibitor): shift-register
fanout w/ seed; drop readgate sig guard`.

- **ChainInhibitor** as 1-round shift register fanning out to `out`
  and `inhibitOut`. On in-fill: emit prior held on both wires, store
  incoming, slot empties. No `canAccept` guards on output wires.
  Seeded via topology `data.seed` (i0, i1 seeded `0`).
- **Wire.load** swallows reloads while in-flight
  (`trace.wire.load.dropped`) — kept as a safety net.
- **ReadGate** partial fill emits `0`, full fill emits `1` and
  consumes. `canAccept` is the only emit gate.
- Ring topology (src → readGate → i0 → i1 → readGate.chainIn2) runs
  without stalling under the current driver/layout.

129 tests green; build clean; tsc clean; vocab clean; LOC clean.

## The model (settled)

- **No tick, no step.** Driver: `halt`/`resume` + `pauseAxis`.
- **canAccept IS the trigger** (wire empty + dest slot empty).
- **Pulse payload is a scalar.** ReadGate emits `0`/`1`; Register and
  ChainInhibitor are 1-round shift registers on the scalar.
- **ChainInhibitor's 2abc rule:** on `in` fill → emit held on both
  wires, store incoming, slot empty. Atomic, no output preconditions.

## Open follow-ups (not urgent)

- The `trace.wire.load.dropped` swallow in Wire.load may be hiding
  real rate-imbalance bugs. Consider promoting dropped loads to a
  hard fail in dev (assertion + console.error) now that the editor
  is debuggable, and see whether the ring still runs.
- Subscription bookkeeping: node bodies still call
  `subscribeCanAccept` (ChainInhibitor subscribes to both `out` and
  `inhibitOut`). User has flagged this as substrate concern leaking
  into nodes. An earlier attempt to move wake into the substrate
  (`sourceNodeRef` on Wire, direct `.run()` calls) was reverted —
  revisit only with a clear design, not opportunistically.
- Merge `task/pulse-secondary-value` into `main` once user signs off.

## Working mode

- Delegate executor work (log walks, mechanical edits) to sonnet/haiku
  subagents. Main session is for judgment.
- Don't propose menus of options when the user is mid-investigation;
  finish the current frame.
- Verify subagent claims (especially log readings) before acting on
  them.
- When the user says "delegate", they want a subagent call, not the
  main session doing the work inline.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs.

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/`.

## Open branches

- `main` — production trunk.
- `task/pulse-secondary-value` — active; working; not merged.

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
