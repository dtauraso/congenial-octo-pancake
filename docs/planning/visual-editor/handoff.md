# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, navigation-tax pass in flight)

**Active branch:** `task/navigation-tax`. NOT merged. 1 commit on
top of `main` (`af4bdf8`). Pushed.

## What landed on main this session

Nothing. All work is on task branches.

## What's on `task/navigation-tax`

- `bf16279` — `animation-audit.html` and `naming-pass.html` at repo
  root. Tabbed HTML artifacts with SVG diagrams. The first audits
  start/continuation hacks (wire seed prefill, InputBody self-start
  RAF, ChainInhibitor heldRef) and proposes "slots can be born
  filled" as the unifying fix. The second documents the naming
  convention used to reduce **navigation tax** (canonical noun per
  concept across Go / topogen / JSON / editor / SVG; channel name
  encodes endpoints; SVG groups carry `data-role` + `data-index`).
  See `naming-pass.html` for the five-step convergence pipeline and
  the pre-commit checklist.

## Other open task branches

- `task/runtime-editor-port-alignment` — has `6811c5` (revert of the
  readGate port rename — restored the animation) and `ec11b0b`
  (disabled the Run button: faded, unclickable). Findings (A) and
  (B) from the prior handoff are now deferred: Go runtime is
  intentionally inert via the disabled Run button; the visual editor
  is the only runtime exercised. Will revisit when `go run .` is
  reactivated.

## Carried-forward work — chain-inhibitor naming convergence

The naming-pass pipeline calls for picking one bounded concept and
converging its vocabulary across all five boundaries. **Chosen
concept:** chain-inhibitor. **Step 1 (map) done this session.** Step
2 (decide canonical noun) is next — user-driven, not delegated.

### Drift map (haiku Explore subagent, 2026-05-19)

Seven distinct spellings of the same concept, by frequency:

| spelling | rough count | where |
|---|---|---|
| `chaininhibitor` (lowercase) | 45+ | TS RNodeKind, SVG `data-role`, trace logs, portspec keys |
| `ChainInhibitor` (PascalCase) | 30+ | Go struct/type, JSON node type, TS `NODE_TYPES` registry |
| `chainInhibitor` (camelCase) | 3 | JSON node ids in `topology.view.json` (`chainInhibitor0/1/2`) |
| `chainIn` | 11 | JSON input port, Go topogen registry key, TS `NODE_TYPES` port |
| `chainIn2` | 3 | JSON feedback-port name in `topology.json` |
| `ChainInhibitorBody` | 5 | TS React component (`node-kinds.tsx`) |
| `ChainInhibitorNode` | 5+ | Go package/struct (`ChainInhibitorNode.go`) |

Also noted: instance variables in `Wiring.go` are `i0Test` (not
`i0`) and `i1` — drift inside the instance naming too. Channel
names already follow the endpoint convention (`readGateToI0`,
`i0ToI1`, `i1AckToReadGate`, `i0ToInhibitRight`).

### Next concrete step (step 2 of the pipeline)

User picks the canonical noun. Suggested ladder (assistant has no
preference — judgment call):

- **Concept name** for the node kind: `ChainInhibitor` everywhere,
  with case flexed only where the host language demands
  (`chainInhibitor` in JSON ids, `ChainInhibitor` in Go types, etc).
  Retire `chaininhibitor` lowercase form entirely — pick `RNodeKind`
  strings to match the JSON convention (`"chainInhibitor"`).
- **Port names** on the kind: `chainIn` / `chainIn2` are
  direction-only and ambiguous. Per Rule 3 in `naming-pass.html`:
  rename to concept-carrying names. Suggested:
  `prevStageIn` / `feedbackIn` (or the topology-instance-specific
  form: `i0In` / `i1Out`, matching the project rule established
  2026-05-18).
- **Instance variables** in `Wiring.go`: `i0Test` → `i0`. Drop the
  `Test` suffix; it leaked from a test fixture.

Once chosen, steps 3–5 (edit per boundary, verify, grep check) are
mechanical — delegate to sonnet subagents one boundary at a time
with the clone-as-insurance pattern.

## Working-tree state

`topology.view.json` carries unstaged camera/position drift carried
across from the prior branch. Untouched on this branch — do not
commit it as part of any navigation-tax work; either revert it
before the next commit on this branch, or land it as its own
single-purpose commit if the user wants to keep the camera tweak.

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
