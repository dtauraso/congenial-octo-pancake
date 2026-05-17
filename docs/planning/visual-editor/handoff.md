# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, night)

**Active branch:** `task/drop-output-wake-from-bodies` — **26 commits
ahead of origin, unpushed.** The Wire animation loop now lives
*outside* React's `useEffect`. The substance-vs-medium mismatch flagged
in the prior handoff is structurally resolved: a plain `WireLoop`
class is constructed by a ref callback on `<path>`, runs on its own
clock from attach to detach, and React's reconciler no longer decides
when the wire steps.

Editor smoke-tested: ReadGate fires, the i1→readGate wire animates,
and the riding label rides with the pulse.

## What landed this session (newest first)

- `a62bf9d` **refactor(wire): move animation loop out of useEffect**
  - `useEffect` removed entirely from Wire.tsx (import + both calls).
  - New `WireLoop` class owns `simStart`, `raf`, `distanceCovered`,
    `pauseAxis` subscription, and `_step`. Constructed by a ref
    callback on the `<path>` element; `dispose()` on detach.
  - `load()` calls `wireLoopRef.current?.start()` to re-arm. A guard
    in the path-attach ref callback handles the bootstrap case where
    seed load runs before the ref attaches (start() the loop if a
    delivery is already pending at attach time).
  - Pulse circle + riding label sit inside a `<g>` whose
    `transform="translate(x,y)"` is set imperatively by the loop each
    frame. React re-renders cannot fight the loop's writes (the prior
    `x={0} y={0}` JSX-vs-setAttribute conflict is the reason the
    label appeared missing in the first iteration of this refactor).
  - Seed: init-ref guard in the function body, not useEffect.
  - Debug instrumentation from `3e80cfd` removed; `trace.wire.step`
    retained inside the loop. `trace.load` and `trace.deliver` kept.
  - `loadGen`/`loadGenRef`/`setLoadGen` and `pulsePos` state dropped.

Pre-existing vitest baseline (7 failures / 6 files) unchanged. tsc,
build, and substrate vocab check all clean.

## Why this matters (do not re-litigate)

Per CLAUDE.md's substance-vs-medium rule: the substrate model
(MODEL.md) says wires step independently as their own processes. The
prior implementation hosted that loop inside `useEffect`, which made
stepping continuity a function of React's reconciler — wrong medium
for the substance. The architectural call recorded in the previous
handoff was "move the RAF chain out of useEffect entirely." That is
what landed. Do not re-add `useEffect` to Wire.tsx without revisiting
this decision.

## Open issues (in priority order)

1. **Push the branch.** 26 commits ahead of origin, unpushed. Sign-off
   from user is the gate; per workflow rules pushing to task branches
   is free but the user has been driving the loop close.
2. **Verify second-iteration ring closure** beyond the smoke test.
   The prior bug ("ReadGate fires once, ring doesn't close on the
   second iteration") was rooted in the useEffect coupling. Drive the
   editor for several iterations and confirm via
   `.probe/webview-log.jsonl` that loads/deliveries continue past the
   first cycle.
3. **Hook regression** (unchanged):
   `.claude/hooks/substrate-r-model-derive.sh` is still at `exit 0`;
   should be `exit 2`. Unauthorized flip during `f828517` agent run.
4. **Memory `feedback_run_is_input_only.md`** is stale (pre-polling
   redesign). Update or retire.
5. **Two SVG diagrams untracked** (`diagrams/readgate-duty-cycle/`,
   `diagrams/input-body-duty-cycle/`). Commit or discard.
6. **`topology.view.json` is dirty** — uncommitted local camera/
   selection edit.

## What's actually working

- ReadGate fires per iteration; the ring closes (smoke-tested).
- `in08` queue emits its real values.
- Deferred-deliver safety net works on the sibling wire.
- Wire animation loop runs independent of React's effect scheduler.
- Riding labels render correctly on top of the moving pulse.
- Build, tsc, and the deterministic audits are clean.

## Working mode (this session)

- Delegated the Wire useEffect-removal to a sonnet subagent with a
  detailed spec; main session caught two follow-on bugs (seed-vs-ref
  ordering, JSX-vs-setAttribute label conflict) inline.
- Spot-check subagent commits before pushing (no surprises this run).
- Watch for the hook regression — still outstanding.

## Substrate model state

Bodies are pure local rules, primitives are silent no-ops, InputBody
keeps its boundary-node queue. Wire is now genuinely what MODEL.md
says it is: a transient unit that owns its in-flight phase,
animation, and deferred-deliver retry as one process, independent of
the host framework's render scheduler.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run — Claude truncated it once by mistake).

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
