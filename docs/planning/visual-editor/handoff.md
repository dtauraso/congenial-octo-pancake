# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, end of session)

**Active branch:** `task/drop-output-wake-from-bodies` — **~38 commits
ahead of origin, unpushed.** Working tree is clean except for two
untracked diagram dirs (carryover; see open issues). No uncommitted
source changes.

Ring smoke-test: `i0` no longer emits `undefined` or `null` pulses.
First-emit is suppressed via the EMPTY sentinel added in `14e9f09`.
Whether the ring still stalls at cycle 6 is **UNKNOWN** — not
re-tested this session after the ChainInhibitor fixes.

## What landed this session (newest first)

- `f42e556` **chore: update local camera/selection in topology.view.json**
- `a6a50a7` **refactor(substrate-r): finish removing seed prop plumbing** —
  drops `seed` from `RNodeSpec.props`, `RWireSpec`, call sites in
  `RSubstrateNode`/`TopologyRoot`/`RSubstrateEdge`, and Wire's init-ref
  seed block. `14e9f09` removed the last consumer; this sweep removes
  the dead plumbing.
- `14e9f09` **fix(chaininhibitor): suppress first-emit when no prior held** —
  module-scope `EMPTY` sentinel so first in-fill stores without
  emitting. Fixes the `null` first-emit from `heldRef` seeded to null.
- `b0ebb0a` **fix(chaininhibitor): guard fire on slot=filled** — restores
  slot-filled guard stripped by `26cd029`; was firing every RAF and
  emitting `undefined`.
- `7e22c02` **diag(wireref): log per-port resolution** — diagnostic logging
  added to find the `i1` outWire gap; still present in the tree.

## Open issues (in priority order)

1. **Audit other node bodies for consume/wire.load ordering.** ReadGate
   and ChainInhibitor are guarded now, but RelayBody, JoinBody,
   RegisterBody, etc. have not been audited. Two paths:
   - **(a)** Audit every body in `node-kinds.tsx` and restore guards
     locally.
   - **(b)** Make `Wire.load` throw on non-empty** instead of silent
     no-op ([Wire.tsx:~356](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)).
     Surfaces every offender loud. Recommended — one commit, exhaustive.
   Currently halfway between: some bodies guard, (b) isn't in place.
2. **Re-smoke the ring.** Cycle-6 stall status unknown after this
   session's ChainInhibitor fixes. Run the ring and log `.probe/webview-log.jsonl`.
3. **Push the branch.** ~38 commits ahead of origin. Sign-off-gated per
   CLAUDE.md.
4. **Hook regression** (carryover):
   `.claude/hooks/substrate-r-model-derive.sh` is still at `exit 0`;
   should be `exit 2`. Do not touch it here — tracked as separate issue.
5. **Memory `feedback_run_is_input_only.md`** is stale (pre-polling
   redesign). Update or retire; the session's conclusion (silent
   `wire.load` is exactly the rate-bug-hider that memory predicted) is
   worth folding in.
6. **Two SVG diagram dirs untracked** (`diagrams/readgate-duty-cycle/`,
   `diagrams/input-body-duty-cycle/`). Commit or discard when ready.

## What's actually working

- ChainInhibitor no longer emits `undefined` or `null`; first-emit is
  suppressed via EMPTY sentinel.
- Seed prop fully removed from the wire/node pipeline (dead plumbing
  gone).
- Wire animation loop runs independent of React's effect scheduler.
- Build, `tsc --noEmit`, and deterministic audits are clean.

## Substrate model state

Bodies should be "pure rules" per `aaf34de`'s framing, but pure-ruleness
depends on substrate primitives being honest about contract violations.
`Wire.load`'s silent no-op breaks that — it lets bodies that skip the
readiness check appear to work, then silently lose tokens. The
model-honest substrate either (a) requires bodies to read
`dest.slotPhase` via the output ref before consuming, or (b) makes
`Wire.load` assert. Currently half-way between: some bodies guard, no
others do, and (b) isn't in place.

## Dev-loop

After any substrate-r edit: `npm run build` (vitest/tsc don't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run — Claude truncated it once by mistake).

Cwd for tsc/tests/check-loc/build: `tools/topology-vscode/`.

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
