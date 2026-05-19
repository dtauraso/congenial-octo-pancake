# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, run-start-concept ready to merge)

**Active branch:** `task/run-start-concept`. NOT yet merged. 11 commits
on top of `main`. Pushed.

## What landed on `task/run-start-concept` (new this session)

Substrate-clean fix for the three audit hacks identified in
`animation-audit.html`:

- **Hack #1 (Wire seed prefill) — retired.** `data.seed` on edges is
  gone. New mechanism: `data.initialSlots: { slotId: value }` on nodes.
  Node construction fills those slots directly; Wire.tsx seed path and
  `seededRef` deleted entirely.
- **Hack #2 (InputBody self-RAF) — reclassified, not changed.** Audit
  page itself reclassified this as not-a-hack. Self-RAF is the substrate
  model: each node kind owns its own RAF loop (`InputBody`, `RelayBody`,
  `JoinBody`). No shared driver.
- **Hack #3 (ChainInhibitor heldRef) — retired.** `heldRef` replaced by
  `data.initialSlots.held`. Bootstrap source node (`bootstrap_rg`,
  kind: `input`) wired into `readGate1.i1In` provides the ring tick-0
  entry; `bootstrap_right` was added then dropped once
  `inhibitRight0` took the ring input directly.
- **ChainInhibitor synchronous shift rule preserved**: one-emit-per-input
  maintained throughout.

Commits: `e465d12` through `bb042ea` (11 total — `git log main..HEAD --oneline`).

## Parked follow-ups (do not lose these)

1. **ChainInhibitorBody `useState(null)` display state** — parallel to
   the real `held` slot, can be deleted; slot is source of truth.
2. **ring-5node.json e2e fixture** — still uses old-style `data.seed`
   format; migrate to `initialSlots` schema.
3. **ReadGate port-alignment branch** (`task/runtime-editor-port-alignment`,
   stashed): `ack` → `i1In` rename happened as side-effect of this
   branch. Verify whether that branch is still needed or can be retired.
4. **Topogen one-shot Input** (`repeat=false`): propagated to TS only;
   Go side currently disabled (Run button faded). Registry will need a
   one-shot if/when Go runtime returns.
5. **`held=null` visual ambivalence** (David's note): held slot is
   born-empty for i0, visibly null in some indicator. Tolerated for now.

## Next concrete step

User approved → merge `task/run-start-concept` into `main`, delete
branch locally and on remote (per `feedback_branch_cleanup`). Then
revisit `task/runtime-editor-port-alignment`.

Do not merge without explicit user go-ahead.

## Working-tree state

`topology.view.json` carries unstaged camera/position drift —
intentionally not committed. Revert or land as a single-purpose commit
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
