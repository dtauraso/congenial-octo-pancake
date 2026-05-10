# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-step1-notes.md](handoff-step1-notes.md) — what was
     built on the rebuild branch (decision audit, coupling hacks
     gated to step 1, automated logging, e2e).
  2. [handoff-gate-a.md](handoff-gate-a.md) — earlier merge to main
     (Gate A).
  3. [handoff-next-task.md](handoff-next-task.md) — **start here**
     for the next commit.
  4. [handoff-rebuild-plan.md](handoff-rebuild-plan.md) — port plan,
     contracts R1–R5, auto-retire signal.
  5. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-09, twenty-sixth session):
  Active branch: `task/node-ticks`. Pair substrate landed last
  session (`98a2b0f`). This session: trimmed `topology.json` +
  `topology.view.json` down to a true Shape A spec (just `in08`
  Input → `readGate1` ReadGate; previously had `i0`+`i1` chain
  inhibitors and an `i1→readGate.ack` feedback edge that made it
  render as 4 nodes in the editor). Pair substrate behavior still
  not observed — user noticed the wrong shape was loaded before
  cadence could be judged.

  Carried context: Shape D self-pumps via `fb56c30`'s i1 fan-out +
  one-shot `seedLoop` + per-round `setTimeout(0)` yield in
  `andGateLoopFanOut`. Conceptual frame: **concurrent clocks frozen
  on command**. Manual-ack doc:
  [../../manual-ack-mechanism.md](../../manual-ack-mechanism.md).

  Working tree: `.claude/settings.json`, `topology.view.json`, and
  pre-existing edits to `runtime-wires-shapes.ts` +
  `test/contracts/runtime-wires-manual-ack.test.ts` carry incidental
  drift — leave or stash. Reference branches retained:
  `task/runtime-substrate-rebuild`, `task/wires`,
  `task/node-visuals-strip`. Do not delete.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place. No Reload
Window, no tab cycling. Watcher logs `[topology] bundleWatcher
fired` to Output → Log (Extension Host).

## Next move

**Observe the pair substrate in the editor.** Code is in; behavior
isn't verified visually yet.

  1. Build + launch the webview (`npm run build` then F5 / Run
     Extension). Open a Shape A spec (single Input → ReadGate).
  2. Watch pulse cadence on `in0→rg`. Expected: one pulse on the
     wire at a time, spaced by arc-traversal time.
  3. If clean: step substrate's same-tick drain was the cause.
     Re-enable Shape D / uniform-node work
     ([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
     [handoff-uniform-node-plan.md](handoff-uniform-node-plan.md)).
  4. If pulses still stack: substrate is exonerated. Bug is in
     [_use-pulse-lanes-wire.ts](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/_use-pulse-lanes-wire.ts).
     Diagnose lanes/geometry there without the step substrate
     confounding the picture.

Open question logged in [handoff-next-task.md](handoff-next-task.md):
should `wPermit` carry the value back so readGate logic depends on
what it received, or stay an opaque "go" token? Defer until a single
pulse round-trips cleanly.

Shape D port and uniform-node work
([handoff-shape-d-plan.md](handoff-shape-d-plan.md),
[handoff-timeout-removal.md](handoff-timeout-removal.md),
[handoff-uniform-node-plan.md](handoff-uniform-node-plan.md))
remain on hold until the pair shape reads as discrete arcs.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
