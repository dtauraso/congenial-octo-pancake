# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-17, items 1+2 landed)

**Active branch:** `task/editor-friction-pass`, at `8802c18`, pushed.
Working tree has uncommitted TEMP probes in `RSubstrateEdge.tsx` and
`registry.tsx` (left intentionally for the run-start follow-up to
reuse) and camera-drift in `topology.view.json` (ignore). Branch is
friction-driven per CLAUDE.md post-v0 posture.

## What landed this session

- `f8af21a` **feat(chain-inhibitor): display held value as in-box
  label** — i0/i1 now show `held=<value>` below the title.

- `6f71ac3` **refactor(item1): delete contract suite and TopologyRoot**
  — 17 substrate contract test files (~1 400 LOC) deleted.
  `TopologyRoot.tsx` deleted. `@testing-library/react` and `happy-dom`
  removed from devDependencies. `view-load-setviewport.test.ts` kept
  (pure function, no substrate dependency). CLAUDE.md and memory
  updated. `tsc --noEmit` clean; `npm run build` clean.

- `8802c18` **test(item2): add 4 editor-path Playwright scenario tests**
  — thin scenario suite in `e2e/scenario-*.spec.ts` pinning
  user-observable behavior via the existing Playwright harness:
  ring-animates, edge-seed, wire-survives-drag, chaininhibitor-held.
  Also adds `e2e/fixtures/ring-5node.json`. All 4 pass.
  Run: `npm run test:e2e` in `tools/topology-vscode/`.

Cross-session backlog with priorities lives in
[recommendations.md](recommendations.md). Update it as items land.
**Next action:** items 4+5 (trivial: hook regression, memory hygiene)
then item 3 (run-start signal). See recommendations.md.

## Open issues (in priority order)

0. **Introduce a shared tick-0 / run-start signal in substrate-r.**
   Today seed is delivered by `Wire.tsx` calling `dest.fill` at
   mount (bypassing `wire.load` and the animation), and InputBody
   self-starts its own RAF loop in a mount `useEffect`. Two local
   mount hacks instead of one substrate concept. Fix shape: add a
   run-start signal; seed becomes `wire.load(seed)` on run-start;
   InputBody first emit subscribes to run-start. See
   [project_runstart_concept_needed.md](../../../memory/project_runstart_concept_needed.md).

1. **Fan-out back-pressure on ChainInhibitor** still unsolved.
   Naive `wire.canAccept && inhibitWire.canAccept` gate broke
   animation both times it was tried. Trace deadlock if retried.

2. **Pacing-by-pixel-length is still load-bearing for correctness.**
   Logical-tick vs physical-wire mismatch; edge detection only works
   when wire lengths happen to align. Design pass needed before code.

3. **Hook regression** (carryover):
   `.claude/hooks/substrate-r-model-derive.sh` is still at `exit 0`;
   should be `exit 2`.

4. **Memory hygiene:** `feedback_run_is_input_only.md` is pre-
   polling-redesign and stale; should be retired or rewritten.

## What's actually working

- End-to-end ring animation with real input values flowing through.
- ReadGate pass-through emits `slots[0]`'s consumed value.
- Edge seed delivers once to dest slot at wire mount.
- Riding dot stays on the wire under paused-drag.
- i0/i1 show `held=<value>` in-box label.
- `tsc --noEmit` clean; `npm run build` clean.
- `view-load-setviewport.test.ts` passes (pure function, kept from
  the deleted contract suite).
- 4 Playwright scenario tests all pass (`npm run test:e2e`).

## Substrate model state

Central tension (unchanged): logical-tick view vs physical-wire view.
The topology is correct in the logical view; the substrate runs in the
physical view. They agree only when wire lengths happen to align.
Recovery requires a clock primitive, barrier, or sequence-tagged values.
No code change yet; this is the next design conversation (#2 above).

## Dev-loop

After any substrate-r edit: `npm run build` (tsc alone doesn't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run).

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
