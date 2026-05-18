# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, end of session)

**Active branch:** `task/drop-output-wake-from-bodies` — **~42 commits
ahead of origin, unpushed.** Working tree is clean except for untracked
diagram dirs and a pre-existing `.claude/settings.json` edit (use of
`$CLAUDE_PROJECT_DIR` in hook paths — not from this session). No
uncommitted source changes.

Ring smoke-test re-run this session. **The ring is alive** — ReadGate
cold-start is not a deadlock; it just takes one full lap to fill
`chainIn2`. Cycle-6 stall not observed. ChainInhibitor shift-register
is correct in code. **But** i0 silently drops emissions whenever its
outgoing wire is still in-flight from the previous fire — confirmed
visually by shortening the `i0→i1` wire (commit `d18a418`), which
brings the cadence back into sync and the drops stop. Correctness is
currently a function of pixel length, which is the wrong substrate
model.

## What landed this session (newest first)

- `d18a418` **chore: shorten i0->i1 wire to confirm rate-mismatch
  diagnosis** — visual test that wire length is load-bearing for
  correctness; staked in topology.view.json as evidence for the
  upcoming back-pressure work.
- `42f20bf` **log: gate per-frame trace emissions on state change** —
  ChainInhibitor.skip, ReadGate.partial, wire.load (rejected),
  wireref.resolve all gated on real state changes. Ring log went from
  ~21k lines/30s to ~200 lines/95s. Surfaced handoff issue #1
  immediately: i0 fires into in-flight outgoing wires, silently
  drops the emission, slot stays consumed.
- `f42e556` **chore: update local camera/selection in topology.view.json**
- `a6a50a7` **refactor(substrate-r): finish removing seed prop plumbing**
- `14e9f09` **fix(chaininhibitor): suppress first-emit when no prior held**
- `b0ebb0a` **fix(chaininhibitor): guard fire on slot=filled**
- `7e22c02` **diag(wireref): log per-port resolution**

## Open issues (in priority order)

1. **Implement back-pressure on ChainInhibitor (and audit other
   bodies).** Now load-bearing — observable token drops confirmed in
   the log. Two paths:
   - **(a) Gate the body's consume on `outWireRef.current?.canAccept`.**
     Body refuses to consume while output is busy. Tokens stay in the
     input slot until output drains. ReadGate then sees the slot still
     filled and doesn't redeliver. Self-paces. **Recommended** — this
     is the substrate-model-honest answer (slot-in-node backpressure).
   - **(b) Make `Wire.load` throw when non-empty**
     ([Wire.tsx:~360](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)).
     Surfaces every offender loud; useful as a separate audit pass
     before (a) is in place.
   Apply (a) to ChainInhibitor first (it's the demonstrated offender),
   then audit Relay/Join/Register the same way.
2. **Push the branch.** ~42 commits ahead of origin. Sign-off-gated per
   CLAUDE.md.
3. **Hook regression** (carryover):
   `.claude/hooks/substrate-r-model-derive.sh` is still at `exit 0`;
   should be `exit 2`. Do not touch it here — tracked as separate issue.
4. **Memory `feedback_run_is_input_only.md`** is stale (pre-polling
   redesign). Update or retire; this session's evidence (silent
   `wire.load` is exactly the rate-bug-hider that memory predicted) is
   worth folding in.
5. **Three SVG diagram dirs untracked** (`diagrams/readgate-duty-cycle/`,
   `diagrams/input-body-duty-cycle/`, `diagrams/chaininhibitor-bootstrap/`).
   Commit or discard when ready.
6. **Pre-existing `.claude/settings.json` edit** ($CLAUDE_PROJECT_DIR
   absolute-path conversion for hook commands) is uncommitted; commit
   or discard when the user decides whether they want it.

## What's actually working

- Ring cycles end-to-end. Values shift through `i0 → i1 → chainIn2`
  and back into ReadGate. Verified by reading the gated log.
- ChainInhibitor shift-register code is correct: one consume atomically
  emits the previously held and stores the incoming.
- ChainInhibitor no longer emits `undefined` or `null`.
- Wire animation loop runs independent of React's effect scheduler.
- Log is readable — only state changes are emitted, dropped tokens
  are visible on the transition into rejected loads.
- Build, `tsc --noEmit`, and deterministic audits are clean.

## Substrate model state

Bodies should be "pure rules" per `aaf34de`'s framing, but pure-ruleness
depends on substrate primitives being honest about contract violations.
`Wire.load`'s silent no-op breaks that — it lets bodies that skip the
readiness check appear to work, then silently lose tokens. **Confirmed
this session by tracing i0**: with the gated log in place the dropped
emissions are visible as `accepted:false` transitions, and shortening
`i0→i1` removes the drops by changing nothing but pixel length.
Topology length cannot be load-bearing for correctness in a system
whose whole premise is that the topology IS the logic — it has to
encode model semantics, not animation timing. The model-honest fix is
slot-in-node back-pressure: body refuses to consume while its output
slot can't accept. Implementing that is the next step.

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
