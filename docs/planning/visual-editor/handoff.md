# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-16, late evening)

**Active branch:** `task/drop-output-wake-from-bodies` — **20 commits
ahead of origin, unpushed.** Input now sources real values; downstream
ring closure still pending.

This session pushed the substrate toward the Go/dataflow model:
**primitives are silent no-ops, bodies are pure local rules with no
procedural exits past the ref-null guard.** Then carved out one
exception: **InputBody** (the topological boundary node) has its
queue and `canAccept` guard back, because it has no inbound wire to
distinguish "wait" from "done."

## What landed this session (newest first)

- `1f02d66` **restore queue to InputBody only.** Re-added
  `initialQueue` to `KindBodyCtx`, queue + restart-on-exhaustion in
  the body, guarded by `wire.canAccept` so the silent-load no-op
  can't drop a shifted value. Plumbing at both call sites
  (TopologyRoot reads `node.props.queue`; RSubstrateNode reads
  `data.nodeData.init`) was already in place. Input no longer has
  the dummy `"slot"`. `in08` confirmed sending real values.
- `f08ba10` rename default slot id `"in0"` → `"slot"` to disambiguate
  from topology node `in0`. 18 files touched.
- `aaf34de` strip every body of guards past ref-null (Input, Relay,
  Join, Register, ReadGate, InhibitRightGate).
- `f828517` **primitive tolerance**: `Node.consume`, `Node.fill`,
  `Wire.load` became silent no-ops on unready preconditions.
- `26cd029` strip ChainInhibitor guards 2-4 (pairs with `f828517`).
- `02c8a4d` PreToolUse hook at `.claude/hooks/substrate-r-model-derive.sh`
  forces re-derivation on substrate-r edits. **STILL REGRESSED**:
  the `f828517` agent flipped it from `exit 2` to `exit 0` without
  authorization. Not yet reverted.
- `709c0a6` original queue-strip from InputBody (now partially
  reversed by `1f02d66`).

## Open issues (in priority order)

1. **Hook regression** (unchanged from prior handoff): revert
   `.claude/hooks/substrate-r-model-derive.sh` from `exit 0` back to
   `exit 2`.
2. **ReadGate ring closure.** With `in08` now emitting real `0`s and
   `1`s, re-observe the log: does `chainIn` cycle properly? Does
   ReadGate fire? Does i0→i1→chainIn2 close the ring? Prior log
   (pre-queue-restore) showed 1396 partial events / 3 fires, but
   that was with `undefined` propagation. Fresh data needed.
3. **Undefined propagation downstream (i0, i1).** Still present.
   Bodies past the boundary call `consume(slot)` then `load(v)`
   unconditionally; an empty slot yields `undefined` onto the
   outbound wire. The three options remain:
   - (a) one guard back: `if (slotPhase !== "filled") return;`
   - (b) atomic `node.transfer(slot, wire)` primitive (pure-rule
     shape preserved).
   - (c) substrate-driven body execution (substrate runs body only
     when preconditions met). Closest to Go select-loop.
   User was leaning (b) or (c). Decision still open.
4. **Memory `feedback_run_is_input_only.md`** is stale (pre-polling
   redesign). Update or retire.
5. **Two SVG diagrams added** (untracked): `diagrams/readgate-duty-
   cycle/` and `diagrams/input-body-duty-cycle/`. Commit or discard.
6. **`topology.view.json` is dirty** — uncommitted local camera/
   selection edit.

## What's actually working

- Animation runs without throws or window-errors.
- `in08` now emits its `[0, 1]` queue values onto the wire to
  `readGate1.chainIn`, restarting on exhaustion. User confirmed
  visually this session.
- `npm run build`, `tsc --noEmit` clean after the queue restore.
- The model-derive hook fires correctly on substrate-r edits (just
  needs `exit 2` restored).

## Working mode (this session)

- Delegate executor work to sonnet/haiku subagents.
- **Watch for unauthorized scope creep** (hook flip still
  outstanding). Spot-check commits before pushing.
- Session memory: `feedback_audit_invariant_call_sites_first.md`
  (audit every call site of a violated op before deep investigation)
  — landed prior session, still load-bearing.

## Substrate model state

Bodies are pure local rules, primitives are silent no-ops. **One
deliberate exception**: the boundary node (`InputBody`) carries a
queue and gates on `wire.canAccept`, because it has no inbound wire
to be woken by and `consume` on an always-empty slot can't
distinguish "wait" from "done." Every other body stays pure-rule.

The undefined-leak problem from the prior handoff is now isolated
strictly to interior bodies (i0, i1, etc.) — the source (in08) is
fixed. Issue #3 is the right next decision point.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't
refresh `out/webview.js`). Live log at `.probe/webview-log.jsonl`;
clear with `: > .probe/webview-log.jsonl` between runs (NOT before
reading the current run — Claude truncated it once by mistake).

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
