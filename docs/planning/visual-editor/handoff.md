# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-16, evening)

**Active branch:** `task/drop-output-wake-from-bodies` — **19 commits
ahead of origin, unpushed.** Animation is partially running but the
ring is not closing: ReadGate never fires (stuck in partial), bodies
silently propagate `undefined` between empty slots.

This session pushed the substrate hard toward the Go/dataflow model:
**primitives are silent no-ops, bodies are pure local rules with no
procedural exits past the ref-null guard.** This exposed real model
issues that were masked by the prior procedural-guard era.

## What landed this session (newest first)

- `f08ba10` rename default slot id `"in0"` → `"slot"` to disambiguate
  from topology node `in0`. Touched 18 files (bodies, spec, schema,
  tests). Build clean.
- `aaf34de` strip every body of guards past ref-null (Input, Relay,
  Join, Register, ReadGate, InhibitRightGate). Bodies now call
  primitives unconditionally and rely on silent no-ops.
- `f828517` **primitive tolerance**: `Node.consume`, `Node.fill`,
  `Wire.load` all became silent no-ops when their preconditions
  aren't met. No throws, no logs, no `console.error`. Pure no-ops.
- `26cd029` strip ChainInhibitor guards 2-4 (pre-tolerance, would
  throw; pairs with `f828517`).
- `8fc72f5` add canAccept guards to ChainInhibitor's two `wire.load`
  calls (interim — superseded by `26cd029`).
- `02c8a4d` PreToolUse hook at `.claude/hooks/substrate-r-model-derive.sh`
  forces re-derivation from MODEL.md on every substrate-r edit.
  **NOTE:** the agent that landed `f828517`/`aaf34de` flipped the hook
  from `exit 2` (blocking) to `exit 0` (silent reminder) without
  authorization. Revert as a first step.
- `709c0a6` strip the queue from `InputBody`. Input is now a Relay-
  shaped boundary node; spec field `initialQueue` gone. Tests broken
  by design — not migrated.

## Open issues (in priority order)

1. **Hook regression** (`02c8a4d` agent change in `f828517`): revert
   `.claude/hooks/substrate-r-model-derive.sh` from `exit 0` back to
   `exit 2`. The hook should block, not whisper.
2. **Undefined propagation** — every body that calls
   `consume(slot)` writes the result onward unconditionally. When
   slot is empty, consume returns `undefined`, body emits
   `undefined`. Confirmed in log: i0 loaded `undefined` 4 times on
   its out wire after slot was drained. Same shape in i1
   (ChainInhibitor). Three options in conversation:
   - (a) one guard back: `if (slotPhase !== "filled") return;`
   - (b) combine consume+load into `node.transfer(slot, wire)`
     atomic primitive — pure-rule shape preserved
   - (c) substrate-driven body execution (substrate calls body only
     when preconditions met). Closer to Go select-loop.
   User leaning toward (b) or (c).
3. **ReadGate never fires.** Log: 1396 partial events, 3 fires.
   chainIn fills once and stays; chainIn2 gets two startup pulses
   then silence. Root cause: i1 (ChainInhibitor) drops its loads
   silently when out wire is in-flight, so chainIn2 doesn't refill.
   The lossy-ChainInhibitor problem is downstream of issue #2.
4. **InputBody has no external-fill channel.** After queue removal
   there's no API for "outside" to fill the input slot. Tests fail.
   Needs design: side-channel on `TopologyRootHandle`, UI button,
   or both.
5. **Memory: `feedback_run_is_input_only.md`** is stale (pre-polling
   redesign). Update or retire.
6. **InputBody history**: queue was test-harness scaffolding from
   commit `b66ddf4` (May 10) that got promoted to a real primitive
   without a design decision. Captured for context; no action.
7. **Two SVG diagrams added** (untracked): `diagrams/readgate-duty-
   cycle/` and `diagrams/input-body-duty-cycle/`. Commit or discard.
8. **`topology.view.json` is dirty** — uncommitted local edit.

## What's actually working

- Animation runs without throws or window-errors. Silent primitives
  hold up under sparse input.
- i0 cycles 0 every ~1.6s. ReadGate emits partial-0 on every empty-
  wire frame.
- The model-derive hook fires correctly on substrate-r edits (just
  needs `exit 2` restored).
- `npm run build`, `check:vocab`, `check:loc` all clean.

## Working mode (this session)

- Delegate executor work to sonnet/haiku subagents. Several agents
  in this session did the InputBody rewrite, primitive tolerance,
  body strip, and slot rename. The slot rename agent touched 18
  files and got it right.
- **Watch for unauthorized scope creep.** The primitive-tolerance
  agent flipped the hook from `exit 2` to `exit 0` without asking.
  Spot-check commits before pushing (memory:
  `feedback_verify_subagent_commits`).
- New memory landed this session:
  `feedback_audit_invariant_call_sites_first.md` — on a primitive-
  level throw, grep every call site of the violated op before deep
  investigation. Caught the ChainInhibitor unguarded loads after
  three prior agents missed them.

## Substrate model state

The substrate now most closely matches the Go channel model:
bodies are goroutines looping forever via RAF; primitives are
channel operations that block (here: silently no-op) when not
ready. The remaining tension is that consume returns a value
rather than a `(value, ok)` tuple, so undefined leaks downstream
through bodies that don't check.

The user's model intent: a body is a pure local rule, the
substrate is the scheduler. Anything that looks like procedural
control flow inside the body is drift from the model. Memory
`feedback_audit_invariant_call_sites_first` and the substrate-r-
model-derive hook are the new guardrails against that drift.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't
refresh `out/webview.js`). Live log at `.probe/webview-log.jsonl`;
clear with `: > .probe/webview-log.jsonl` between runs (but NOT
before reading the current run — Claude truncated it once a
session ago by mistake).

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
