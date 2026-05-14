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

**Active branch:** `task/substrate-slot-in-node`. Tip `24de543`.
Working tree: `topology.view.json` (pre-existing, unrelated),
`memory/MEMORY.md` (new memory link), untracked
`memory/feedback_specify_substrate_layer_first.md` and
`docs/planning/visual-editor/diagrams/pause-as-substrate-property.svg`.
126/126 vitest green, tsc clean, `check:loc` clean, vocab clean.

**This session: diagnosis + spec for substrate-layer pause.** No
code landed. The user observed that the play/pause button only
visibly halts `in0→readGate`. Traced the cause:

- `driver.halt()` only freezes the **cohort cursor**, not wires
  ([useTickDriver.ts:88](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts#L88)).
- In-flight wires keep their RAF and keep delivering
  ([Wire.tsx:142](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L142)).
- The cohort gate's `released` set is **monotonic** — `release(n)`
  only adds
  ([cohort-gate.ts:21-28](../../../tools/topology-vscode/src/webview/substrate-r/cohort-gate.ts#L21-L28)).
  After one lap of the cycle, every wire's cohort is permanently in
  `released`, so the gate has no remaining authority over cohorts
  1+. Only fresh cohort-0 loads (in0→readGate) park.

**Why this shape happened:** pause was specified only at the visible
layer ("pause button"); the substrate-layer question ("what does a
wire do when paused?") was left implicit, and the implementation
reached for the nearest global axis (the cursor) to fill it. New
feedback memory:
[feedback_specify_substrate_layer_first.md](../../../memory/feedback_specify_substrate_layer_first.md)
— generalizes [[substrate-vs-coordinator-bias]] into a workflow
rule about *when* the bias strikes (at under-specified substrate
slots).

**Spec for the fix** lives in the new diagram
[diagrams/pause-as-substrate-property.svg](diagrams/pause-as-substrate-property.svg):
pause is a property of **wire advancement** (RAF + delivery), not of
the cohort cursor. Lifting it from one wire to the substrate makes
it compose with self-sustaining loops.

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

1. **Implement substrate-layer pause** per
   [diagrams/pause-as-substrate-property.svg](diagrams/pause-as-substrate-property.svg).
   Sketch:
   - Add a `paused` axis to the substrate — an observable bool with
     `subscribe(cb)`. Could fold into `cohort-gate.ts` or live as a
     sibling `pause-axis.ts`. Decide based on whether anything else
     wants it; default to sibling file to keep the gate's
     monotonic-released invariant clean.
   - `Wire.tsx`: the RAF step reads `paused`. When true, stop
     advancing `distanceCovered` and freeze `pulsePos`. On resume,
     recompute `simStart` so the pulse continues from where it
     stopped. `deliverIfPending` / `tryFinalize` also gated on
     `paused` — endpoint-reached wires stay frozen at endpoint
     until resume.
   - `useTickDriver.halt/resume` flip the axis (in addition to
     halting cursor advancement).
   - Plumb the axis through `TopologyRoot` → `RSubstrateEdge`
     (substrate landing rule: both test path and editor path).
   - Contract test in `r-tick-driver.test.tsx`: pulsePos stable
     across pause; resume continues from saved position; delivery
     deferred until resume.
   - **Substrate-layer spec to commit to up front (per the new
     feedback memory):** a wire under pause is a clock that has
     stopped reading its own time source. No central authority is
     consulted. Each wire stops itself when the axis observably
     reads true.
2. **Retire ChainInhibitor's `⇢` debug button.** ChainInhibitor is
   not a source. Its only legitimate emit is "consume my slot and
   forward that value." The `⇢` button bypasses the slot and loads
   a literal `1`, giving a non-source node source powers. Remove
   from
   [node-kinds-chain-inhibitor.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds-chain-inhibitor.tsx).
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
