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

**Active branch:** `task/substrate-slot-in-node`. Pushed.
Working tree: `topology.view.json` (pre-existing, unrelated).
117/117 vitest green, tsc clean, `check:loc` clean, vocab clean.

**This session shipped the concept-bounded substrate refactor.**
substrate-r/ went from 16 files → 11; the Wire concept and the
Node-kinds concept are each one file again. Plan and rationale in
[diagrams/refactor-concept-bounded/](../../../diagrams/refactor-concept-bounded/).

Commits:
- `6967904` — plan diagrams (3 SVGs) for the refactor.
- `6925cb3` — phase 1: shared `renderKindBody` switch in
  `node-kinds.tsx`; both `TopologyRoot` and `RSubstrateNode` call it.
  Kind-mirroring fork gone.
- `6c2ac9a` — phase 2a: merged `node-kinds-readgate.tsx` +
  `node-kinds-chain-inhibitor.tsx` into `node-kinds.tsx` (234 LOC).
  Carved substrate-r/ out of the LOC budget in `check-loc.mjs` and
  CLAUDE.md (substance is concept-bounded, not byte-bounded).
- `869df39` — phase 2b: merged `wire-phase.ts` + `edge-path.ts` +
  `EdgeLabels.tsx` into `Wire.tsx` (311 LOC). To follow a pulse, open
  one file.

**Phase 2c (driver+axis audit) — kept separate.** `pause-axis.ts`
and `useTickDriver.ts` look mergeable but are two distinct model
concepts ("self-scheduling nodes + one global play/pause gate" —
the model names both). Driver uses axis; they don't collapse. SVG
[02-target-concept-bounded.svg](../../../diagrams/refactor-concept-bounded/02-target-concept-bounded.svg)
updated to reflect this audit finding.

**Phase 2d (RSubstrate*/TopologyRoot full collapse) — deferred.**
These three files (`TopologyRoot.tsx`, `RSubstrateNode.tsx`,
`RSubstrateEdge.tsx`) serve genuinely different rendering contexts:
plain SVG harness for contract tests vs React Flow handles/store for
the editor. The substantive dedup (the kind switch) is done. Further
collapse risks deleting context-specific behavior. Revisit if the
editor anomaly (below) turns out to involve one of these wrappers.

**Phase 3 done.** CLAUDE.md "Substrate primitive landing rule"
narrowed: node kinds are now auto-landed via the shared switch; the
rule covers only wire props and registry/driver plumbing. Memory
`feedback-substrate-landing-requires-editor-path` and MEMORY.md
index entry updated to match.

**Live editor verification:** pause/step/resume confirmed working
by user. Something else extra happened during verification (not
described) — flagged for next session to investigate.

**Open architectural items (carried):**
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

1. **The editor anomaly.** User reported "something extra happened"
   during pause verification that isn't pause-related. Ask the user
   to describe it; reproduce; decide whether to fix on this branch
   or split a `task/<short-kebab>` for it.
2. **Retire ChainInhibitor's `⇢` debug button.** ChainInhibitor is
   not a source. Its only legitimate emit is "consume my slot and
   forward that value." The `⇢` button bypasses the slot and loads
   a literal `1`, giving a non-source node source powers. Remove
   from [node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
   (ChainInhibitorBody now lives there, post-merge).
3. **Housekeeping carry.** Flag `task/in0-readgate-emission-ack`
   for user-approved deletion (auto-retire signal hit — first green
   contract test landed in `31c6cdb`).
4. **Offer merge to `main`** after (1)–(3) are clean.

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
- **Concept-bounded code, not layer-bounded.** Layered decomposition
  (types here, geometry there, dispatch elsewhere) is a human cache
  strategy that costs machine readers re-projection on every read.
  substrate-r/ files are concept-bounded — one file per model
  concept (Node, Wire, Slot, Axis, Driver). See
  [diagrams/refactor-concept-bounded/](../../../diagrams/refactor-concept-bounded/).
- **Snapshot + motion as a pair.** chan-wire (snapshot) +
  chan-anim (motion).
- **Decentralized, not distributed.** "Decentralized" = no center
  exists, the property is genuinely local. Pause-axis is genuinely
  decentralized: each wire's RAF reads the axis locally, no central
  scheduler consulted.

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

Read [MODEL.md](../../../MODEL.md), CLAUDE.md's narrowed "Substrate
primitive landing rule", and the two concept-bounded primitive files
([node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
for kinds, [Wire.tsx](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx)
for the wire concept). After any substrate-r edit, run `npm run
build` — vitest/tsc alone don't refresh `out/webview.js` (stop-hook
does this, but only when bundled TS changed and the output is older
than the input).

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
