# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, post-SPEC-system, idle)

**Active branch:** `main` at `3f0c52b`. No active task branch.

This session landed three merges that compressed the kind-authoring
surface and introduced a SPEC.md-per-kind system:

1. **`task/runtime-wiring-loader`** — deleted `cmd/topogen`, `cmd/topogend`,
   and generated `nodes/Wiring/Wiring.go`. Go reads `topology.json` at
   startup via `nodes/Wiring/loader.go` + `builders.go`. No more codegen
   subprocess on Run. Net −1785 / +611 LOC.
2. **`task/collapse-kind-registration`** — deduped `RF_NODE_TYPE_MAP`,
   replaced the kind→RF-type map with a one-line camelCase function,
   and rewrote `builders.go` to derive port manifests via reflection on
   each Go struct's channel fields. Net −104 LOC.
3. **`task/spec-system`** — defined `nodes/SPEC-FORMAT.md` (5-column
   port schema + loader-managed/non-channel/firing-rule/runtime-status
   sections), landed 5 code fixes the format pass surfaced (AndGate
   missing TSX, Streak{,Break}Detector missing from `kindRegistry`,
   dead `Inhibitor.EndFromPartition`, vestigial `EdgeInhibitor.FromEdge`
   drain, TSX-handle-id ↔ Go-field-name alignment for 9 kinds), and
   wrote a SPEC.md per kind (14 total). Net +557 / −39 LOC.

## Architecture at handoff

**Editor (TS / React Flow):**

- Per-kind RF custom nodes at `tools/topology-vscode/src/webview/rf/nodes/<Kind>Node.tsx` (14, plus folds/notes). Render-only.
- `rf/edges/SubstrateEdge.tsx` renders the wire + pulse animation.
- Per-kind fire-flash via `rf/nodes/use-fire-flash.ts` on `node.data.lastFire`.
- State in RF + thin helpers (`folds-state.ts`, `viewer-state.ts`, `run-status-state.ts`, `dimmed-state.ts`, `rf-imperative.ts`, `history.ts`, `pump.ts`).
- Save/load via `spec-to-flow.ts` + `flow-to-spec.ts`. `topology.json` is RF-native shape.
- Kind→RF-type mapping is now derivable: `specKindToRfType(k) = k[0].toLowerCase() + k.slice(1)`. The explicit map is gone.

**Runtime (Go):** the canonical runtime. `main.go` calls
`Wiring.LoadTopology("topology.json")` which:

- Parses topology.json.
- Walks each declared kind's struct via reflection to derive its port manifest (name, direction, cardinality, element type) — no hand-written per-kind builders.
- Allocates one `chan int` per edge (slice append on `fan-out` ports).
- Allocates dead-end buffered channels for declared-but-unwired output ports.
- Pre-fills Input nodes' loader-managed channels from `data.init`.
- Populates non-channel fields (e.g. `ChainInhibitor.HeldValue`) per kind.

**SPEC system:** `nodes/SPEC-FORMAT.md` defines the format; each
`nodes/<Kind>Node/SPEC.md` is the canonical description of that kind
(ports, loader-managed channels, non-channel fields, firing-rule
pseudocode, runtime status, open questions). SPEC.md is the future
source of truth for kind authoring; today it documents existing kinds
and the AI can use it as the contract for parity checks.

**Banned-vocabulary rule:** slot / phase / backpressure / canAccept /
wire.load belong to Go. If TS code outside `pump.ts` accumulates any
of them, that is drift.

## Adding-a-kind surface (current)

Authoring touch count is **4 places** today:
1. `nodes/<Kind>Node/<Kind>Node.go` — struct + firing rule.
2. `nodes/<Kind>Node/SPEC.md` — pseudocode + port manifest per SPEC-FORMAT.
3. `tools/topology-vscode/src/webview/rf/nodes/<Kind>Node.tsx` — render component.
4. `tools/topology-vscode/src/webview/rf/app/_constants.ts` — one entry in `RF_NODE_TYPES`.
5. `nodes/Wiring/builders.go` — one entry in `kindRegistry` (+ optional `populate` for non-channel init).

(That's 5; the prior count of 6 dropped to ~5 with the collapse. Net
removed: `RF_NODE_TYPE_MAP`, its duplicate in `_use-drag-drop.ts`, and
the hand-written port manifest per kind.)

The destination shape we discussed but did NOT land: SPEC.md drives
everything — TSX is one generic component, `RF_NODE_TYPES` becomes one
entry total, builders use reflection (already true). Then authoring is
**1 SPEC + 1 Go body**. Phase 2.

## Open issues surfaced by SPEC audit (not blocking)

The SPEC.md pass against fixed code surfaced four real gaps the
code-fix pass missed. Documented as Open Questions in the relevant
SPECs:

- **ChainInhibitor TSX** is missing handles for `ToEdgeNew` and `ToAck`.
- **ReadLatch TSX** is missing a handle for `ToAck`.
- **InputNode** has a TSX-handle-id ↔ Go-field-name divergence (`ToOut` vs `ToNext`). Riskier to fix because `topology.json` references the current handle id.
- **TransferInhibitor** chan-of-chan wiring convention is undocumented (design question, not a defect).

## Parked follow-ups (older)

1. **Rename UX** — double-click-to-rename was unreliable post-Phase 3 (`68e1897` added a `wrapper` fallback). Iterate when convenient.
2. **`TransportControls` play button** — stubbed inert (`bd697fe`). Wire once a replay-from-trace mode is wanted.
3. **`lastRecv` visualization** — pump writes `node.data.lastRecv`; no kind renders it. Decide: recv-pulse or drop the field.
4. **Undo/redo timing nuances** — edge cases on rapid sequences / fold-collapse with selection. Probe `.probe/webview-log.jsonl` while iterating.
5. **Stale memory entries** — several `feedback_*` / `project_*` files reference substrate-r concepts (`feedback_substrate_landing_requires_editor_path`, `feedback_run_is_input_only`, `feedback_per_emit_simtime_anchoring`, `feedback_edge_seed_required_for_rings`, `project_runstart_concept_needed`). Predate the RF migration; review and prune or rewrite.
6. **`spec-to-flow` / `flow-to-spec` adapters** — post-RF-migration, `topology.json` is RF-native shape. These may be near-identity functions worth collapsing.

## Next concrete steps (candidates)

Friction-driven from here. If picking from the list:

- **SPEC phase 2 (generic renderer)** — collapse the 14 TSX files to one component driven by SPEC port manifest + side declarations. Reaches "1 SPEC + 1 Go body" authoring goal. Sizeable refactor.
- **Resolve audit gaps** — add the missing ChainInhibitor / ReadLatch TSX handles (low risk).
- **Stale memory prune** (parked #5) — cheap, read by every future session.
- **Authoring skill** — `/new-kind` slash command that walks the pseudocode → SPEC → Go skeleton dialog, with the parity check (port↔field↔handle alignment + behavioral check pseudocode↔Go).

## Working-tree state

Clean. `topology.json` and `topology.view.json` modifications from
prior sessions were folded into the runtime-wiring-loader merge.

## Dev-loop

After any TS edit: `npm run build` (tsc alone doesn't refresh
`out/webview.js`). After extension-host code changes: Reload Window in
VS Code (Cmd+R) — webview changes hot-reload, extension code doesn't.
Live probe log at `.probe/webview-log.jsonl`. Cwd for
tsc/tests/check-loc/build: `tools/topology-vscode/`. Go side:
`go build ./...` from repo root; `go run .` runs the canonical
topology and streams trace JSONL to stdout. The editor's Run button
invokes the same path via the extension subprocess (no codegen step
between save and Run anymore).

## Substrate model state

MODEL.md and CLAUDE.md point at `nodes/Wiring/loader.go` +
`nodes/Wiring/builders.go` as the wire-mesh substance (the old
`Wiring_gen.go` reference is gone). The banned-vocabulary rule still
applies, pointed at Go. SPEC-FORMAT.md is the new substrate-adjacent
document — per-kind contracts in pseudocode form.

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
