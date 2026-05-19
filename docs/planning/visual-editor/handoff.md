# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, chain-inhibitor convergence landed)

**Active branch:** `task/navigation-tax`. NOT merged. 7 commits on
top of `main` (`af4bdf8`). Pushed.

## What landed on main this session

Nothing. All work is on `task/navigation-tax`.

## What's on `task/navigation-tax` (new this session)

The chain-inhibitor naming-convergence pipeline (step 3 from
`naming-pass.html`) ran end-to-end across the five boundaries
(Go / topogen / JSON / TS editor / SVG). Six commits:

- `c6f7d23` — Wiring.go `i0Test` → `i0` (drop fixture-leaked suffix).
- `bd3c42b` — Go port keys `chainIn` / `chainIn2` → `i0In` / `i1In`.
- `d73eaae` — JSON fixtures port rename (topology.json, e2e, parseSpec).
- `732b156` — TS editor lowercase → camelCase + port keys + ReadGate trace label.
- `596645a` — cleanup of stragglers (e2e runtime check string, testdata edge ids, planning JSON).
- `7e364ce` — planning SVGs (`lateral-cascade.svg`, `overview.svg`) lowercase → camelCase.

Decisions recorded:

- Canonical noun: `ChainInhibitor`, case-flexed per host language.
- Ports: `chainIn` / `chainIn2` → `i0In` / `i1In` (instance-specific,
  per 2026-05-18 rule).
- Instance var: `i0Test` → `i0`.
- `TransferInhibitor` kept distinct (separate node kind).
- `spec.ts` `case "chaininhibitor"` retained — intentional
  toLowerCase normalization, not drift.

Verification: `go build ./...`, `go test ./...`, `tsc --noEmit`, and
`npm run build` all green after the cleanup commit.

## Known stale references (out of scope, historical)

These planning docs still contain `chaininhibitor` lowercase and were
intentionally left as point-in-time records:

- `docs/planning/visual-editor/recommendations.md` (scenario filename)
- `docs/planning/visual-editor/firing-rule-fix-spec.html` / `.md`
  (postLog trace string `trace.chaininhibitor.fire` — actual code now
  emits `trace.chainInhibitor.fire`)

If a future task touches those specs, normalize then. Don't sweep
purely for sweep's sake.

## Other open task branches

- `task/runtime-editor-port-alignment` — has `6811c5` (revert of the
  readGate port rename — restored the animation) and `ec11b0b`
  (disabled the Run button: faded, unclickable). Findings (A) and
  (B) from the prior handoff remain deferred: Go runtime is
  intentionally inert via the disabled Run button; the visual editor
  is the only runtime exercised. Will revisit when `go run .` is
  reactivated.

## Working-tree state

`topology.view.json` carries unstaged camera/position drift from a
prior branch — untouched on this branch and intentionally not
committed. Either revert it before the next commit or land it as its
own single-purpose commit if the user wants the camera tweak.

## Next concrete step

Convergence is done for ChainInhibitor. Options for next:

1. **Merge `task/navigation-tax` into main.** Six clean rename
   commits + the audit/naming-pass HTML artifacts. Requires user
   sign-off (merge into shared `main`).
2. **Run the same naming-pass pipeline on another concept.**
   Candidates surfaced during this pass:
   - `TransferInhibitor` (parallel kind, may have similar drift)
   - `inhibitrightgate` (lowercase form spotted in planning SVGs)
   - Wiring.go instance vars beyond `i0`/`i1` if any drift remains
3. **Pivot to a different friction.** The parked list below has
   open items.

State the next step before acting; the convergence loop has no more
queued mechanical work to drain.

## Parked (revisit when friction returns)

- Go runtime: re-enabling Run button, fixing topogen `data.seed`
  honoring (finding B from prior handoff), Wiring.go ring deadlock.
  All deferred while substrate work continues in the webview.
- Marker overshoot tuning, grow port on zero-input nodes, pacing by
  pixel length, obstacle-aware routing, auto-pick for snake-v,
  multi-digit ints in Input queue editor.
- A memory entry for "ChainInhibitor heldRef is a third
  instance of the run-start hack family" (third hack in
  `animation-audit.html`, not yet recorded).

## Substrate model state

MODEL.md (as of 2026-05-17 / `485f041`): no global round, tick, or
simultaneity layer. Local slot-phase coordination. Banned vocab
(tick/round/step/cohort/lap) enforced in substrate-r/ by vocab check
script. The 2026-05-18 design rule still stands: node struct fields
and port names are topology-instance-specific; the editor renames
them when the topology changes.

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
