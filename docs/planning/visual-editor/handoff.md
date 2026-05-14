# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff was previously split into four sibling files to satisfy
the 100-LOC budget. Audit 19 (reading-trip economy) flagged that as
anti-economic: forcing a fresh AI to read 4 docs in sequence costs
more than reading one slightly-larger doc. Re-merged; handoff.md is
now exempt from the LOC rule (see CLAUDE.md "File size budget").

---

## State at handoff (2026-05-13, end-of-session)

**Active branch:** `task/substrate-slot-in-node`. Tip `e2c5418` (plus
this organizational follow-up). Working tree has one pre-existing
modification to `topology.view.json` (unrelated to this session's
work). 126/126 vitest green, tsc clean, `check:loc` clean,
`out/webview.js` rebuilt.

**Substrate model changed this session.** Cohort is now
observation-only (a label on wires for the scrub cursor); delivery
happens at RAF arrival, not at load. A single `wire.load` no longer
cascades synchronously through the topology — each hop costs one
wire animation. See commit `44406cd`. Canonical model definitions
(slot-in-node, cohort, ticks, banned vocabulary) live in
[MODEL.md](../../../MODEL.md) — do not re-define them here.

**Housekeeping pass landed (8 commits on top of `44406cd`).**
Repo-org reductions targeting AI bash round-trip cost: collapsed
24-file `session-log/` into one file, archived 11 historical handoff
splits + 14 phase-plan docs, trimmed CLAUDE.md under 200 LOC, fixed
the substrate-r ghost path in CLAUDE.md and the vocab script, added
a Bash hygiene section. Top-level `docs/planning/visual-editor/`
went from 26 entries to 8 live docs + 3 subdirs.

**Audit 19 follow-up (this commit).** Re-merged the handoff split,
pruned duplicated model prose now pointed at MODEL.md.

## Next move

1. **Live re-verify the cycle.** Reload the webview against
   `topology.json` and confirm that in resume mode the
   readGate1 ↔ i0 ↔ i1 cycle still pulses continuously, now with
   each hop visibly animating along one wire at a time. Press i1's
   `⇢` and confirm one pulse on i1→readGate (not an instant
   topology-wide cascade). Verification was originally done under
   the old delivery model and needs redoing.
2. **Retire ChainInhibitor's `⇢` debug button.** ChainInhibitor is
   not a source. Its only legitimate emit is "consume my slot and
   forward that value." The `⇢` button bypasses the slot and loads
   a literal `1`, giving a non-source node source powers. Remove
   from
   [node-kinds-chain-inhibitor.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-chain-inhibitor.tsx).
3. **Housekeeping carries.** Flag `task/in0-readgate-emission-ack`
   for user-approved deletion (auto-retire signal hit — first green
   contract test landed in `31c6cdb`). Tune the banned-vocab list
   in `scripts/check-substrate-vocab.mjs`: it inherits banned terms
   (rAF, `performance.now`, `simStart`) that are legitimate under
   the decoupled-clocks model — reports 7 hits in Wire.tsx /
   useTickDriver.ts that should not be flagged.
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
`npm run build` — vitest/tsc alone don't refresh `out/webview.js`.

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
