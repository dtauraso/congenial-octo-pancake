# Collapse to 2 representations

## Goal

Reduce hand-maintained representations of a kind/instance from 6 to 2:
**Go struct** (`nodes/<Kind>/<Kind>.go`) and **`topology.json`**. Everything
else becomes generated or removed.

## Why

Each parallel representation is a dual-maintenance tax paid every session.
The Populator removal (`d1f0156`) collapsed one axis (`data.*` now tag-driven).
This branch continues that direction. Removing Relay/Join eliminated the
editor-only escape hatch, so the 2-floor is actually reachable.

See [handoff.md](handoff.md) for state at branch creation.

## Current layers (7 total, 6 hand-maintained)

Kinds:
1. **Go struct** — `nodes/<Kind>/<Kind>.go` (authoritative)
2. **SPEC.md port table** — `nodes/<Kind>/SPEC.md`
3. **`main.go` blank imports**
4. **`node-defs.ts`** — generated from #2 via `gen:node-defs`
5. **TS schema parser** — `tools/topology-vscode/src/schema/`

Instances:
6. **`topology.json`** (authoritative)
7. **`topology.view.json`** — RF positions/viewport

Floor target: #1 + #6 only.

## Four collapses, in order

### Step 1 — `main.go` blank imports → `go:generate`

Replace hand-edited blank-import block with a `go:generate` directive that
walks `nodes/` and writes the imports. Mechanical; no design.

Verify: `go build ./...` and `go test ./...` green after adding a stub kind
and running `go generate`.

### Step 2 — SPEC.md port tables → Go AST (the big one)

`gen-node-defs.mjs` currently walks `nodes/*/SPEC.md` and parses port tables.
Replace with an AST walk over `nodes/*/*.go` reading channel-typed struct
fields and `wire:` tags. SPEC.md's port table is then redundant; the
narrative (View, firing rule) stays as human doc or is deleted.

Verify: `node-defs.ts` regenerates identically (diff against pre-change),
editor loads all 4 kinds with correct ports.

Unlocks: `node-defs.ts` (#4) is now AST-derived; SPEC.md no longer
machine-consumed.

### Step 3 — TS schema parser → Go→TS type codegen

The Go struct + tags become the source of truth for node-data types. Emit
`.d.ts` (or a runtime validator) from Go; editor consumes generated types
instead of hand-written validators. Eliminates the schema-parser-parity
risk ([[feedback-schema-parser-parity]]).

Verify: save/load round-trip on a topology with all 4 kinds; no validator
divergence between Go and editor.

### Step 4 — Merge `topology.view.json` into `topology.json`

Move RF positions/viewport under a `view` key in the main file. Judgment
call (git-diff cleanliness vs. one fewer file); skip if the diff cost feels
worse than the layer cost.

## Done criteria

- `nodes/<Kind>/<Kind>.go` and `topology.json` are the only files a human
  edits to add a kind or change a topology.
- `go generate ./...` + `npm run gen:node-defs` produce all derived
  artifacts.
- `go test ./...` and editor load/save round-trip green.

## Out of scope

- Substrate/wire/pump changes (this is build-tooling, not substance).
- Rewriting `pulse-secondary-value.md` (separate next-option (a)).
- Removing SPEC.md prose — only the port table is required to go; prose can
  stay until friction appears.
