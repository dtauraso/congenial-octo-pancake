# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, post-codegen-removal, idle)

**Active branch:** `main` at `cdd6196`. No active task branch.

This session removed the `topogen` codegen step. The Go runtime now reads
`topology.json` at startup via `nodes/Wiring/loader.go` + `builders.go`
and assembles the mesh in memory. No more generated `Wiring.go`, no
more `cmd/topogen` subprocess on every Run, no more `topogend` daemon,
no more TS `topogenRunner`. Net −1785 / +611 LOC across the merge.

Run pipeline now:
- Editor "Run" → extension saves `topology.json` → spawns `go run .` →
  `main.go` calls `LoadTopology("topology.json")` → trace streams →
  pump → RF state writes → animation.

Verified end-to-end in the editor: Reload Window is required after
extension-host code changes (Cmd+R), but Run then works.

Prior context still applies: the RF migration (Phases 1–4) completed
earlier and the conformance audit (`23a6ba5`) found zero substrate-
shaped TS code outside `pump.ts`.

## Architecture at handoff

**Editor (TS / React Flow):**

- Each substrate node kind is a static RF custom node under
  `tools/topology-vscode/src/webview/rf/nodes/<Kind>Node.tsx` (14 of
  them) — render only, no simulation.
- `rf/edges/SubstrateEdge.tsx` renders the wire path + animates the
  pulse circle from `edge.data.pulse`.
- Per-kind nodes glow on fire via `rf/nodes/use-fire-flash.ts`
  reading `node.data.lastFire`.
- State lives in RF + a handful of thin module-level helpers under
  `rf/`: `folds-state.ts`, `viewer-state.ts`, `run-status-state.ts`,
  `dimmed-state.ts`, `rf-imperative.ts`, `history.ts` (RF-snapshot
  undo/redo), `pump.ts` (51-LOC trace-event translator).
- Save/load via `spec-to-flow.ts` (forward) and `flow-to-spec.ts`
  (reverse). `topology.json` is the persistence format (RF-native shape).

**Runtime (Go):** the only canonical runtime. Goroutines + channels.
Slot phase, wire backpressure, the entire substrate model lives here
(`nodes/<Kind>/`, `Wiring_gen.go`, etc.). Trace events stream from Go
stdout → extension parser → webview pump → RF state writes →
component animation. No TS substrate logic anywhere.

**Banned-vocabulary rule (from CLAUDE.md):** slot / phase /
backpressure / canAccept / wire.load belong to Go now. If TS code
outside `pump.ts` starts accumulating any of them, that is drift.

## Audit verdict

The conformance audit (2026-05-19) found zero substrate-shaped TS code,
zero graph state outside RF, pump is 51 LOC of pure translation, all
trace event kinds handled, no carve-out files. Only finding was stale
documentation, which was fixed in the audit's own merge commit.

## Parked follow-ups

1. **Rename UX** — double-click-to-rename was unreliable post-Phase 3
   (the fix in `68e1897` added a `wrapper` fallback selector but the
   user couldn't trigger it in verification). Not a regression that
   blocks anything; iterate when convenient.
2. **`TransportControls` play button** — still stubbed inert
   (commit `bd697fe`). It controls timeline replay, separate from the
   live Run button. Wire it once a replay-from-trace mode is wanted.
3. **`lastRecv` visualization** — pump writes `node.data.lastRecv`
   but no kind renders it. Decide whether nodes should pulse on recv
   in addition to fire, or drop the field.
4. **`RF_NODE_TYPE_MAP` duplication** — the palette drop site
   (`_use-drag-drop.ts`) inlines a copy of the kind→RF-type map that
   lives in `spec-to-flow.ts`. Export from one place.
5. **Undo/redo timing nuances** — basic mutations work, but some
   edge cases (rapid sequences, fold-collapse with selection) may
   double-snapshot or miss snapshots. Probe `.probe/webview-log.jsonl`
   when iterating.
6. **Stale memory entries** — several `feedback_*` / `project_*`
   memory files reference substrate-r concepts (e.g.,
   `feedback_substrate_landing_requires_editor_path`,
   `feedback_run_is_input_only`,
   `feedback_per_emit_simtime_anchoring`,
   `feedback_edge_seed_required_for_rings`,
   `project_runstart_concept_needed`). They predate the migration and
   should be reviewed and removed or rewritten to point at Go.

## Next concrete step

Idle on main. No task in flight. Friction-driven from here per the
post-v0 posture: open `topology.json` in the editor, drive features,
log friction into `session-log.md`, and let real problems pick the
next task branch.

If picking from the parked list, **#6 (stale memory)** is the cheapest
and highest leverage — it's read by every future session.

## Working-tree state

`topology.json` and `topology.view.json` have uncommitted modifications
from in-session editor testing; user opted to keep them rather than
revert. Not blocking; they'll either be committed or reverted on
demand later.

## Dev-loop

After any TS edit: `npm run build` (tsc alone doesn't refresh
`out/webview.js`). Live probe log at `.probe/webview-log.jsonl`. The
Phase 4 trace pipeline writes additional events there with `phase4.*`
labels and to `.probe/phase4-pump.jsonl` (extension side). Cwd for
tsc/tests/check-loc/build: `tools/topology-vscode/`. Go side:
`go build ./...` from repo root; `go run .` runs the canonical
topology and streams trace JSONL to stdout. The editor's Run button
invokes the same path via the extension subprocess.

## Substrate model state

MODEL.md and CLAUDE.md were rewritten in the audit commit to reflect
the post-migration architecture (Go owns the substrate; pump is the
sole TS translator; RF nodes/edges are render-only). The banned
vocabulary rule still applies, but now pointed at the Go side. No
TS-side carve-out remains.

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
