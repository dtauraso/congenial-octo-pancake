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

## State at handoff (2026-05-13, end-of-session)

**Active branch:** `task/substrate-slot-in-node`. Tip `38f9e12`.
Working tree has one pre-existing modification to
`topology.view.json` (unrelated to this session's work). 126/126
vitest green with **0 stray errors** (down from 3 noise lines per
run), tsc clean, `check:loc` clean, vocab check clean, `out/webview.js`
rebuilt.

**This session: code-smell audit + audit 20 (new).** Two sweeps
landed back-to-back:

**Sweep 1 — substrate code-smell audit** (commits `e932b0a`,
`b8cdab9`):
- Retired `"feedback-ack"` from the `EdgeKind` union and the `"ack"`
  output ports from `ReadLatch` / `ChainInhibitor` (palette) /
  `DetectorLatch`. Type-driven retirement: dropping it from the
  union surfaced every site (schema, colors, palette options,
  EdgeLabels render branch). The `↻`-prefix / bold-weight ack
  visual is gone.
- Documented the asymmetry in `useTickDriver.advance()`: fast path
  uses RAF as an idle throttle; slow path uses `queueMicrotask` as a
  re-entrancy guard. Was flagged by the audit as a substrate-pacing
  leak; investigation confirmed it isn't (pacing lives in wire RAFs).

**Sweep 2 — audit 20 (AI usage leak)** added and run (commits
`fad49f9`, `2b3e495`, `5e29622`, `6ac8ed6`, `38f9e12`). New audit
category lives at
[audits/20-ai-usage-leak.md](audits/20-ai-usage-leak.md); ran a
first pass against the repo and resolved every finding:

- **#1–3, #14 (per-turn fixed tax).** CLAUDE.md "Core concepts" and
  "Backpressure pattern" sections (~40 LOC) duplicated MODEL.md;
  collapsed to a one-paragraph pointer. Deleted
  `memory/project_backpressure_pattern.md` (described retired
  `readGate`/`syncGate`/`detectorLatchAck` wiring as live).
- **#4 (per-turn vocab noise).** `scripts/check-substrate-vocab.mjs`
  now honors `// vocab-ok: <reason>` per-line opt-out. Tagged the
  legitimate visual-layer uses in `Wire.tsx` and `useTickDriver.ts`.
  Vocab check now reports clean instead of 7 false positives.
- **#5 (per-test teardown noise).** Stubbed `requestAnimationFrame`
  to a no-op in `test/contracts/r-tick-driver.test.tsx` and added
  `afterEach(cleanup)`. The driver's fast-path RAF was firing after
  happy-dom teardown between test files. Errors went 3 → 0.
- **#6 + #7 (memory index).** Split MEMORY.md into **Background**
  (stable workflow/hygiene rules, skim once) and **Active**
  (project/substrate state, re-verify against code).
- **#9 + #10 (settings).** Pruned stale SVG-grep one-offs from
  `settings.local.json`; added `npx --no-install tsc`, `git push`,
  `git log`, `git diff`, `git merge` to `settings.json` allowlist.
- **#11 (registry duplication).** Added
  `RUNTIME_IMPLEMENTED_KINDS: ReadonlySet<string>` to
  `schema/node-types.ts` — PascalCase mirror of `RNodeKind`.
  Readers can now derive "will this kind animate?" from code, not
  from the prose comment.
- **#12 (stop-hook).** `scripts/stop-checks.sh` now skips
  `npm run build` when only `test/` files changed, or when
  `out/webview.js` is already newer than every bundled TS file.
- **#13 (verification doc).** CLAUDE.md workflow note: `tsc
  --noEmit` and vitest alone do not refresh `out/webview.js`.
- **#15 (memory overlap).** Consolidated
  `feedback_substrate_visual_pacer.md` into
  `feedback_substrate_vs_coordinator_bias.md` as a second concrete
  failure mode; the visual_pacer file referenced retired
  pre-slot-in-node mechanics (`joinLoop`, `awaitReady`, `ackWire`).

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
