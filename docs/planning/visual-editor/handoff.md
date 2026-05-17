# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, late evening)

**Active branch:** `task/drop-output-wake-from-bodies` — **25 commits
ahead of origin, unpushed.** ReadGate fires *once* now, but the ring
still doesn't close on the second iteration. The smoking gun this
session shifted the framing from "fix Wire" to "Wire is in the wrong
medium."

## The framing decision the next session should consider first

> The friction is using **React's effect lifecycle as the substrate's
> stepping mechanism**. Each wire is supposed to be an independent
> process that polls its own state, but in the implementation,
> "polling" means a RAF chain whose continuity depends on React not
> unmounting the effect, on `setPulsePos` not triggering a render
> cascade that touches deps, on `pauseAxis.subscribe` firing in the
> right order, etc.

The substrate model (MODEL.md) says wires step independently. The
medium (React + RAF inside `useEffect`) couples them through the
reconciler. This is the **substance vs medium** mismatch from
CLAUDE.md, in action.

The likely architectural fix: **move the RAF chain out of `useEffect`
entirely.** Let each wire own a plain JS loop (started at construction,
stopped at unmount) that React only *observes* for rendering. Wire
stepping should not be a function of React's render schedule.

Decide this before patching Wire.tsx further.

## What landed this session (newest first)

- `3e80cfd` **temporary instrumentation in Wire.tsx** (+54 LOC):
  `trace.wire.effect.enter / .cleanup / .step` keyed by `traceId`,
  including a `changed: [...]` array of dep churn per re-entry. Built
  cleanly. **Revert before merge — debug-only.**
- `da0aa2f` `fix(wire): restart animation effect on rapid arrive+load
  batching`. Added `loadGenRef`/`loadGen` so the animation `useEffect`
  re-arms even when React batches `arrive` + `load` into a single
  in-flight phase. Unblocked the **first** ReadGate fire.

## What the instrumentation revealed

Log spans 16.4s. ReadGate fired ONCE (line 2877). Second load on
`in0.out->readGate.chainIn` (line 2889, value=1) entered animation
cleanly (one `effect.enter`, no spurious cleanup). `step` events
advanced `distance` from 0 → ~121/183 at nominal 0.08 px/ms, then
**~7 seconds of silence on this wire** while `readgate.partial` kept
streaming. No `effect.cleanup`, no `effect.enter` — the RAF chain
just stopped scheduling itself.

Failure modes still consistent with this evidence:
1. `pauseAxis?.paused` flipped to `true`, step() returned at
   [Wire.tsx:295](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L295)
   without rescheduling RAF, and the subscribe at line 313–320 only
   re-arms on a paused→unpaused transition.
2. An exception inside step() (would be in browser console, not the
   log).
3. The component re-rendered in a way that didn't change deps but
   *did* break the closure somehow (less likely — refs survive).

The "dep-churn / pathD thrashing" hypothesis is **ruled out** by the
log: no cleanup events fired after the in-flight effect entered.

## Open issues (in priority order)

1. **Architectural call: should Wire's animation loop leave
   `useEffect`?** Per the quote above. This is the substance-vs-medium
   decision the user flagged. If yes, design the JS-owned wire loop
   first, then port; do not patch Wire.tsx further.
2. **Pause-axis instrumentation** (only if the architectural call is
   "no, patch in place"). Add `trace.wire.pause.enter / .resume / .step.skipped`
   logs to confirm/rule out failure mode (1) above.
3. **Hook regression** (unchanged from prior handoff):
   `.claude/hooks/substrate-r-model-derive.sh` is still at `exit 0`;
   should be `exit 2`. Unauthorized flip during `f828517` agent run.
4. **Revert the instrumentation commit `3e80cfd`** once the diagnosis
   is settled. Debug-only LOC must not merge.
5. **Memory `feedback_run_is_input_only.md`** is stale (pre-polling
   redesign). Update or retire.
6. **Two SVG diagrams untracked** (`diagrams/readgate-duty-cycle/`,
   `diagrams/input-body-duty-cycle/`). Commit or discard.
7. **`topology.view.json` is dirty** — uncommitted local camera/
   selection edit.

## What's actually working

- ReadGate fires correctly *once* per editor session.
- `in08` queue emits its real values.
- Deferred-deliver safety net works on the sibling wire
  (`i1.out->readGate.chainIn2` delivered 17ms after consume freed the
  slot — proves the model-faithful path).
- Build, tsc, and the deterministic audits are clean.

## Working mode (this session)

- Delegate executor work to sonnet/haiku subagents (held all session).
- Spot-check subagent commits before pushing (no surprises this run).
- Watch for the hook regression — still outstanding.

## Substrate model state

Bodies are pure local rules, primitives are silent no-ops, InputBody
keeps its boundary-node queue. The model is internally consistent;
the implementation gap is now squarely on **Wire as a React component
trying to host an independent process**.

Per MODEL.md, the wire is supposed to own its in-flight phase,
animation, and deferred-deliver retry as one transient unit. The
React-effect framing inverts authority: the *reconciler* decides when
the wire gets to step.

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
