# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, run-start-concept landed)

**Active branch:** `main`. No active task branch.

`task/run-start-concept` merged to `main` at `a75770c` and deleted
locally and on remote.

`task/runtime-editor-port-alignment` exists locally only (never pushed
after merge). Has stashed `topology.view.json` drift (`git stash list`
will show entries). Decision needed — see Next concrete step.

## What landed on `main` this session (run-start-concept, commit `a75770c`)

- **`data.initialSlots` field** added to node spec. Node construction
  fills named slots directly at startup; replaces edge-side `data.seed`.
- **Bootstrap node pattern** established: a kind-`input` node
  (`bootstrap_rg`) wired into `readGate1.i1In` provides ring tick-0
  entry without a shared driver.
- **Audit-page hack #2 reclassified**: InputBody self-RAF is the
  substrate model (each node kind owns its own RAF loop); not a hack.
- **ChainInhibitor synchronous shift rule preserved**: one-emit-per-input
  maintained throughout.
- **Edge-side `data.seed` retired**: Wire.tsx seed path and `seededRef`
  deleted entirely.

## Parked follow-ups (do not lose these)

1. **ChainInhibitorBody `useState(null)` display state** — parallel to
   the real `held` slot; can be deleted — slot is source of truth.
2. **ring-5node.json e2e fixture** — still uses old-style `data.seed`
   format; migrate to `initialSlots` schema.
3. **ReadGate port-alignment branch** (`task/runtime-editor-port-alignment`,
   local only, stashed): `ack` → `i1In` rename happened as a side-effect
   of the run-start branch (Go registry already updated). Reassess
   whether remaining work on that branch is still needed or retire it.
4. **Topogen one-shot Input** (`repeat=false`): propagated to TS only;
   Go side currently disabled (Run button faded). Registry will need a
   one-shot if/when Go runtime returns.
5. **`held=null` visual ambivalence** (David's note): held slot is
   born-empty for i0, visibly null in some indicator. Tolerated for now.

## Next concrete step

User direction needed. Options:
- Resume `task/runtime-editor-port-alignment`: apply stashed
  `topology.view.json` drift and assess remaining port-rename work
  (Go registry `ack` → `i1In` already done; check what's left).
- Pick a parked follow-up above (items 1 or 2 are mechanical and cheap).
- Pivot to a new friction-driven task.

## Working-tree state

`topology.view.json` on `main` has unstaged camera/position drift —
intentionally not committed. Stash entries on
`task/runtime-editor-port-alignment` also touch this file. Resolve
before the next substantive change.

## Substrate model state

MODEL.md (as of 2026-05-17 / `485f041`): no global round, tick, or
simultaneity layer. Local slot-phase coordination. Banned vocab
(tick/round/step/cohort/lap) enforced in substrate-r/ by vocab check
script. The 2026-05-18 design rule still stands: node struct fields
and port names are topology-instance-specific.

## Dev-loop

After any substrate-r edit: `npm run build` (tsc alone doesn't
refresh `out/webview.js`). Live log at `.probe/webview-log.jsonl`;
clear with `: > .probe/webview-log.jsonl` between runs (NOT before
reading the current run). Cwd for tsc/tests/check-loc/build:
`tools/topology-vscode/`. Go runtime is currently disabled in the
editor UI; `go build ./...` still works for sanity checks.

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
