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

## State at handoff (2026-05-14, cohort retirement)

**Active branch:** `task/substrate-slot-in-node`.
Working tree: `topology.view.json` (pre-existing, unrelated).
117/117 vitest green, tsc clean, `check:loc` clean, vocab clean.

**This session: cohort machinery retired from the substrate.**
The cohort gate, cursor, and lap-label infrastructure were removed.
The legacy all-wires-empty round-close is restored. Design rationale
preserved in
[docs/planning/cohort-future-feature.md](../../../docs/planning/cohort-future-feature.md).

**Substrate-layer pause was implemented** in a prior session:
pause is a property of **wire advancement** (RAF + delivery), not of
the cohort cursor. Each wire reads `pauseAxis.paused` in its RAF loop
and freezes in place; `halt/resume` flip the axis.

**Carried from last session:**
- Live re-verify of resume-mode cycle: **DONE** (user confirmed).

**Open architectural items (carried from last session):**
- **R4** (small follow-up):
  [RSubstrateEdge.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateEdge.tsx)
  imports `dashForKind` and `markerEndUrl` from `../rf/`; substrate
  should not depend up the stack. Move helpers down into
  `substrate-r/edge-style.ts`.
- **R5** (watch-only):
  [app.tsx](../../../tools/topology-vscode/src/webview/rf/app.tsx)
  (146 LOC, 21 imports) is the highest-coupling file; flag for
  decomposition next time it's edited.

## Next move

1. **Cohort retired** — `cohort-gate.ts`, `cohort-assign.ts`,
   `CohortAssigner.tsx` deleted; cohort field removed from
   `RWireSpec`; `assignCohorts` removed from `spec.ts`; registry
   stripped of `setCohorts`/`getWireCohort`; all cohort-referencing
   tests deleted or rewritten. See
   [docs/planning/cohort-future-feature.md](../../../docs/planning/cohort-future-feature.md).
2. **Retire ChainInhibitor's `⇢` debug button.** ChainInhibitor is
   not a source. Its only legitimate emit is "consume my slot and
   forward that value." The `⇢` button bypasses the slot and loads
   a literal `1`, giving a non-source node source powers. Remove
   from
   [node-kinds-chain-inhibitor.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-chain-inhibitor.tsx).
3. **Housekeeping carry.** Flag `task/in0-readgate-emission-ack`
   for user-approved deletion (auto-retire signal hit — first green
   contract test landed in `31c6cdb`).
4. **Offer merge to `main`** after (2)–(3) are clean.

## Conceptual frame

- **Logic state IS visible state.** No render/logic split. Every
  primitive is specified as visible-state-transition rules; data
  shape is derived from the visual, not the other way around. See
  [memory/feedback_visual_first_default.md](../../../memory/feedback_visual_first_default.md).
- **The industry's projection bias.** Static abstractions get
  privileged because they're tractable for symbolic reasoners;
  they're lossy compressions of the actual phenomenon. The
  substrate rebuild rejects projection: visuals before logic,
  transitions before snapshots, motion before structure.
- **Snapshot + motion as a pair.** chan-wire (snapshot) +
  chan-anim (motion).
- **Decentralized, not distributed.** "Decentralized" = no center
  exists, the property is genuinely local. "Distributed" = the
  center is reconstructed from pieces, which is what most
  coordinator-shaped designs do under a different name. Resolved
  tick = edge cohort is genuinely decentralized.

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user
  to name the next frame.
- When designing fixes, first ask: what does the Go side do?
  Channels back-pressure locally; gates back-pressure locally.
  Coordinator-shaped fixes are training-data drift.
- Use Claude Code as a fabricator, not a co-designer.
- Do not collapse temporal phenomena into static snapshots without
  keeping a separate temporal view alongside.

See `memory/feedback_substrate_vs_coordinator_bias.md` and
`memory/feedback_visual_first_default.md`.

## Open branches

- `main` — production trunk; check `git log` for tip.
- `task/substrate-slot-in-node` — this branch (see state above).
- `task/in0-readgate-emission-ack` — parked, auto-retire signal
  hit. Deletion needs explicit user sign-off per branch-hygiene
  rules.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

Read [MODEL.md](../../../MODEL.md), CLAUDE.md's "Substrate
primitive landing rule", the three primitive files
([RSubstrateNode.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateNode.tsx),
[RSubstrateEdge.tsx](../../../tools/topology-vscode/src/webview/substrate-r/RSubstrateEdge.tsx),
[node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
+ siblings), and
[Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)
for the decoupled-clocks model. After any substrate-r edit, run
`npm run build` — vitest/tsc alone don't refresh `out/webview.js`
(stop-hook does this, but only when bundled TS changed and the
output is older than the input).

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/` (Bash
resets cwd — chain `cd` or use absolute paths). Stop hook active:
`scripts/stop-checks.sh` runs go build / tsc / check:loc / npm run
build on relevant changes and blocks stop on failure. If user
surfaces unrelated friction, log to
[session-log.md](session-log.md) and open a fresh
`task/<short-kebab>`.

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
