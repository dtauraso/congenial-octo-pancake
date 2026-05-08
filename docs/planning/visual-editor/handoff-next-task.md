# Handoff — Next task (START HERE)

**State:** `main` is at `392602f`. Both this session's task-branch
merges (visuals 1–4, pause-freeze) have landed. `task/node-ticks`
still exists locally; it's safe to reuse or to cut a fresh
`task/<short-kebab>` for the next thing.

## What's done

- All four node visuals on the wires runtime: flash, glow ring,
  held tint, buffered halo.
- Pause = mid-arc freeze. `subscribeWiresPause` broadcasts a single
  pause/resume signal; each `PulseInstance` owns its own rAF clock
  and freezes/rebases independently. **Conceptual frame:** not a
  global clock, but concurrent clocks frozen on command. Carry
  this framing forward — it generalises as more node types port.

## What's NOT done (and why it's parked)

- Legacy globals (`sim/runner`, `sim/event-bus`, `legacyRunnerState`,
  `pauseRunner`, `isPlaying`) are still imported by AnimatedEdge,
  PulseInstance, TimelinePanel, Bookmarks, RunnerProbe,
  fold-halo-probe, `_handle-load`, `_on-node-drag`. They no longer
  control in0/readGate behavior on the matched path (wires runtime
  drives those), but they're load-bearing for the legacy/no-match
  path and for the pulse-rAF/transport plumbing.
- Removing them is gated on **port-plan steps 4–6** in
  [../sim-substrate/rebuild-plan.md](../sim-substrate/rebuild-plan.md):
  pilot port one inhibitor, then bulk port, then delete probes.
  Don't start without a friction signal or an explicit ask.

## Next: friction-driven

Per post-v0 posture, no queued task. Drive the editor; narrate
observations; log to [session-log.md](session-log.md). When a
friction pattern surfaces, that becomes the next task.

If a substrate-level next-step IS called for, the most natural one
is the pilot port (port-plan step 4): port `ChainInhibitorNode`
onto the wires substrate. That would extend the matched-topology
predicate in `match.ts` and exercise the substrate beyond the
trivial Input→ReadGate.

## Working tree note

`.claude/settings.json` and `topology.view.json` carry orthogonal
uncommitted drift. Leave or stash.

## ALWAYS clause

At end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the task branch.
Do not rely on chat history; the next AI may be a fresh model with
no transcript. The rendered handoff must itself contain this same
ALWAYS clause so the loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
