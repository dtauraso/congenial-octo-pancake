# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-20, post Populator API removal)

**Active branch:** `main` at `f432cb4`. No task in flight.

### What landed since last handoff

- **`d1f0156`** refactor(Wiring): replace Populator API with wire struct tags —
  deleted `Populator` type, `populate` field on `kindEntry`, third arg from
  `Register`. Non-channel fields use `wire:"data.<key>"` or
  `wire:"data.initialSlots.<key>"` struct tags. `InputNode.Init` and
  `ChainInhibitorNode.HeldValue` migrated.
- **`f432cb4`** docs(handoff): refresh after Populator API removal. Merged
  `task/remove-populator-api` ff to main; branch deleted local + remote.

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
   Wiring.Register("Kind", func() any { return &Struct{} }) }`.
   Non-channel fields read from `data.*` JSON use struct tags:
   - `wire:"data.<key>"` — copies `NodeData.<Key>` (e.g. `[]int` from `data.init`)
   - `wire:"data.initialSlots.<key>"` — reads `NodeData.InitialSlots[key]` (int)
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
  Non-channel fields are populated from `data.*` JSON via `wire:` struct tags.

## Next options (priority order — pick on friction)

**(a) Re-spec `pulse-secondary-value.md`** against the current RF + Go
architecture, then execute. Payload `{primary, secondary}`, new `register`
kind, ReadGate slot-fill emit rule. Doc must be rewritten before any code.

**(b) Go-AST port parsing** — derive port names from Go structs instead of
SPEC.md tables. Eliminates dual-maintenance. Natural follow-on to the
Populator removal: `data.*` is now tag-driven; extend the same idea to
channel ports.

## Parked follow-ups

1. **Rename UX** — double-click-to-rename was unreliable post-Phase 3.
2. **`TransportControls` play button** — stubbed inert.
3. **`lastRecv` visualization** — pump writes it; no kind renders it.
4. **Stale memory entries** — several `feedback_*`/`project_*` files
   reference substrate-r concepts pre-dating the RF migration.
5. **`spec-to-flow`/`flow-to-spec` adapters** — may be near-identity
   functions worth collapsing post-RF migration.

## Working-tree state

Clean. `topology.view.json` was merged into `topology.json#view` and deleted (Step 4 of collapse-representations).

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
