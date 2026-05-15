# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget (per CLAUDE.md "File
size budget"): a fresh AI session must read it end-to-end, and audit
19 found that splitting it across siblings cost more reading time
than keeping one slightly-larger doc.

---

## State at handoff (2026-05-14, end-of-session)

**Active branch:** `main`. No task branch in flight. 5 commits ahead
of `origin/main` (not pushed).

`InhibitRightGate` is **landed and working in the live editor** —
pulses confirmed flowing through the cascade with the new lateral
inhibit edges in place.

## What was done this session

1. **SVG plan diagrams updated** (`fb8f80a`) to surface sign-off
   decisions and the multi-output shape: DECISION badges on
   topology/firing SVGs (R2, R3); three side-by-side option panels
   for Risk 1 (KindBodyCtx shape) on the dispatch SVG.
2. **`KindBodyCtx` migrated to named map** (`8ddd331`):
   `outWireRef: RefObject<...>` → `outWireRefs: Record<string,
   RefObject<...>>`. Both wire-prop fork sites updated
   (`TopologyRoot.tsx` and `RSubstrateNode.tsx`).
3. **InhibitRightGate landed** (`950eba1`): new
   `substrate-r/inhibit-right-gate.tsx`, `spec.ts` registration,
   `renderKindBody` dispatch case, `chaininhibitor` outputs extended
   to `["inhibitOut", "out"]`, ChainInhibitorBody updated for
   lockstep fan-out (option (A)), `topology.json` + `topology.view.json`
   add `inhibitRight0` with two new `inhibit-in` edges.
4. **Deadlock fix** (`b6b1b33`): the gate's body bailed before
   draining `left` when (a) no out wire was connected or (b) both
   slots were filled. Lockstep fan-out then froze i0. Rewrote `run()`
   against the full INHIBIT(L=1,R=0) truth table; `left` always
   drains when warranted, emit is conditional.

## Resolved sign-off decisions (recorded for future kinds)

- **R1 — KindBodyCtx shape:** named map `outWireRefs:
  Record<string, RefObject<WireHandle|null>>`, keyed by output port
  name from `NODE_KIND_PORTS`. Scales to N outputs without
  positional fragility; symmetric with input slots (which are
  already name-addressed).
- **R2 — fire-on-L-alone:** correct INHIBIT semantics. When `left`
  fills and `right` stays empty, the gate emits.
- **R3 — sourceHandle name:** edges from i0/i1 to inhibitRight0 use
  `sourceHandle: "inhibitOut"`.
- **Multi-output firing semantics (ChainInhibitor):** **(A) lockstep
  fan-out.** Both `out.canAccept` AND `inhibitOut.canAccept`
  required before firing; one consume, two loads of the same value.
  Rationale: lateral inhibit must arrive in the same round as the
  chain pulse so InhibitRightGate's R slot is in the expected
  phase. (B) opportunistic side-fan would silently drop inhibits.

## The model (settled — unchanged)

- **No tick.** No tick counter, no tick concept.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger.
- **Running ≠ emitting.** `run()` is a handler; pulsing out depends
  on local preconditions.

## Next move

No queued task. Open follow-ups (friction-driven, pick when relevant):

- **Tests for InhibitRightGate firing semantics** (plan §Test Plan,
  deferred from `950eba1`). Vitest unit + a TopologyRoot integration
  test covering the four truth-table cases.
- **`readNew` output port on ChainInhibitor.** Schema declares it
  (`node-types.ts`), but `NODE_KIND_PORTS` only lists
  `["inhibitOut", "out"]`. No body-side consumer yet — add when a
  topology actually uses it, otherwise leave dormant.
- **Push 5 unpushed commits to `origin/main`** when you're ready
  (`fb8f80a`, `8ddd331`, `950eba1`, `b6b1b33`, plus this handoff).

## Carried items (still open)

- R5 (watch-only): `app.tsx` coupling.

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** No center exists.
- **canAccept IS the trigger.** No scheduler, no walker, no clock.
- **Running ≠ emitting.** Sources can run and decline to pulse.
- **Concept-bounded code, not layer-bounded.**

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user to
  name the next frame.
- When designing fixes, first ask: what does the Go side do?
- Delegate executor work to haiku/sonnet subagents; reserve main
  Opus session for judgment.
- **Don't pause for sign-off when the user has already said go.** This
  session lost a turn asking permission after "do the named map." If
  the frame is named and decisions are recorded, just execute.

See `memory/feedback_substrate_vs_coordinator_bias.md` and
`memory/feedback_visual_first_default.md`.

## Open branches

- `main` — production trunk; only active branch.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

After any substrate-r edit, run `npm run build` — vitest/tsc alone
don't refresh `out/webview.js` (stop-hook does, but only when bundled
TS changed and output is older than input).

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
