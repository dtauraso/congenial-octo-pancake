# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-20, post ChainInhibitor ToNext consolidation)

**Active branch:** `task/kind-audit-consolidation` at `55a4092`. Rebased
onto `main` (which is at `409193c` after `task/firing-rule-unit-tests-spec`
merged and was deleted local + remote).

### What landed since last handoff

- **`b4dcabc`** refactor(ChainInhibitor): consolidate outputs into ToNext
  fanout — removed `ToEdge`, `ToReadGate`, `ToNextChainInhibitorNode`;
  replaced with single `ToNext []chan<- int` fanout. ReadGate's
  `FromChainInhibitor` now receives the held int (arrival is the gate;
  value discarded).
- **`55a4092`** docs(kind-audit): updated ChainInhibitor + ReadGate sections
  for new shape.

### Surviving kinds (4)

Input, ReadGate, ChainInhibitor, InhibitRightGate.

### Tests

Per-kind firing-rule unit tests live at `nodes/<Kind>Node/firing_rule_test.go`.
No `Trace/FixtureParity_*` files; no `.trace.jsonl` fixtures.
`go test ./...` green.

### Stale planning doc

`docs/planning/visual-editor/pulse-secondary-value.md` was written in
pre-RF substrate-r vocabulary. The ChainInhibitor port restructure piece
of it just landed standalone. The full secondary-value mechanism (payload
`{primary, secondary}`, new `register` kind, ReadGate slot-fill emit rule)
is still unimplemented. The doc needs re-writing against the current RF +
Go architecture before execution.

## Adding a kind (3 files)

1. `nodes/<Kind>/<Kind>.go` — struct + firing rule + `init() {
   Wiring.Register("Kind", func() any { return &Struct{} }, populate) }`.
2. `nodes/<Kind>/SPEC.md` — ports table, View section, firing rule,
   runtime status (per `nodes/SPEC-FORMAT.md`).
3. `main.go` — one blank import line: `_ "github.com/dtauraso/wirefold/nodes/<Kind>"`.

`node-defs.ts` regenerates via `npm run gen:node-defs` (also runs as
prebuild). `builders.go` is not touched.

## Architecture summary

- **Editor (TS / React Flow):** one `GenericNode.tsx` reads `node-defs.ts`
  (generated) and renders all kinds. `SubstrateEdge` for wires. State via
  RF + thin helpers. `gen-node-defs.mjs` walks `nodes/*/SPEC.md`.
- **Runtime (Go):** `main.go` blank-imports the 4 kinds; each `init()`
  calls `Wiring.Register`. `Wiring.LoadTopology` parses `topology.json`
  and uses reflection on each registered struct to build the port manifest.
  `populate` is a per-kind hook for non-channel fields.
- **Editor-only kinds (no Go body):** Relay, Join.

## Next options (priority order — pick on friction)

**(a) Re-spec `pulse-secondary-value.md`** against the current RF + Go
architecture, then execute. Payload `{primary, secondary}`, new `register`
kind, ReadGate slot-fill emit rule. Doc must be rewritten before any code.

**(b) Struct-tag populates** — remove Populator API; wire `Init` from
struct tags. Input is the only remaining `populate` user.

**(c) Go-AST port parsing** — derive port names from Go structs instead of
SPEC.md tables. Eliminates dual-maintenance.

## Parked follow-ups

1. **Rename UX** — double-click-to-rename was unreliable post-Phase 3.
2. **`TransportControls` play button** — stubbed inert.
3. **`lastRecv` visualization** — pump writes it; no kind renders it.
4. **Stale memory entries** — several `feedback_*`/`project_*` files
   reference substrate-r concepts pre-dating the RF migration.
5. **`spec-to-flow`/`flow-to-spec` adapters** — may be near-identity
   functions worth collapsing post-RF migration.

## Working-tree state

`topology.view.json` has unstaged edits — leave untouched. Otherwise clean.

## Dev-loop

After any TS edit: `npm run build` from `tools/topology-vscode/` (tsc alone
doesn't refresh `out/webview.js`). After extension-host changes: Reload
Window in VS Code (Cmd+R). Go: `go build ./...` from repo root;
`go run .` runs `topologies/line.json` (default `--topology`).

## ALWAYS clause

At end of session, overwrite this file with a freshly-rendered prompt
tailored to the state you're leaving the branch in, and commit on the
active branch (main if no task is in flight). Do not rely on chat history;
the next AI may be a fresh model with no transcript. The rendered handoff
must itself contain this same ALWAYS clause so the loop is
self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md) as the
structural source of truth; update the template when an invariant changes.
