# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, post-merge, idle)

**Active branch:** `main` at `308a452`. No active task branch.

`task/runtime-editor-port-alignment` merged via `308a452` and deleted
locally and on remote.

## What landed on main this session

**Option A naming sweep** — port (field) names and channel ids unified
across TS and Go.

- **Port (field) names**: PascalCase directional, matching Go struct
  fields verbatim. `FromValue` / `FromAck` / `ToGated` / `FromPrev` /
  `ToNext` / `ToEdge` / `FromLeft` / `FromRight` / `ToPassed` /
  `FromIn` / `FromA` / `FromB` / `ToJoined` / `ToOut`.
- **Edge / channel ids**: camelCase `<srcInstance>To<DestInstance>`.
  E.g. `in08ToReadGate1`, `i0ToI1`, `i0ToInhibitRight0`,
  `bootstrapRgToReadGate1`. Same form in Go's `Wiring.go` / `Line.go`
  channel variables.
- **`topology.json` ports**: per-instance `ports:` override; TS
  `NODE_KIND_PORTS` defaults serve as arity-only placeholders.

**Phase 1 refactor** killed hardcoded output-port-name string literals
in `node-kinds.tsx` — output wire refs now derive from
`NODE_KIND_PORTS`, the single source of truth. The three-string
coupling (`port.name` ↔ edge `sourceHandle` ↔ literal in dispatch)
is now two strings.

**View-state durability**: orphan view-edge-key detection landed.
`_handle-view-load.ts` warns + emits probe entry
`view.orphan-edge-key { key, knownEdgeIds }` at load. `parseSpec(input,
view?)` throws on orphan when view is threaded through. The editor's
load path uses the warning; future batch tooling can use strict mode.

## Substrate clarification (worth keeping)

`bootstrap_rg` is the substrate-clean TS analog of Go's
`i1AckToReadGate <- 1` pre-send in `nodes/Line/Line.go:31`. Both
implementations need a bootstrap; Go hides it in harness wiring, TS
promotes it to a first-class topology node.

Both Go's and TS's ReadGate require both inputs before emitting
(no partial-firing). The 2026-05-17 partial-0 removal (`f273f6a`,
see `feedback_readgate_partial_0_is_spec`) is the spec for both
runtimes.

## Parked follow-ups (carry to next task)

1. **ChainInhibitor `ToEdgeNew`** field is Go-only; TS substrate has
   no declaration (port `readNew` referenced only by trace fixtures).
   Either declare in TS or delete from Go as vestigial.
2. **ChainInhibitor `ToAck`** field generates dead-end channel vars
   (`i0ToAck`, `i1ToAck`) per topogen's `id + capitalize(field)`
   pattern; functional but inconsistent with semantic naming.
3. **ChainInhibitorBody `useState(null)`** display state — parallel
   to the real `held` slot; can be deleted.
4. **Topogen one-shot Input** (`repeat=false`): TS only; Go side
   disabled (Run button faded).
5. **`held=null` visual ambivalence** — tolerated.
6. **8 vitest test files failing to load** with missing-module errors
   (`rename-core`, `fold-core`) — pre-existing on main, unrelated to
   any work this session. Worth a triage pass.

## Next concrete step

Idle on main. User direction needed. Cheap / mechanical options:

- **Parked item 3** (delete `useState(null)` display state) — smallest
  reasonable task; concept-bounded edit in one file.
- **Parked item 1** (declare `readNew` / `ToEdgeNew` in TS, or delete
  on Go side as vestigial) — design choice first, then small edit.
- **Parked item 6** (triage the 8 failing-to-load vitest files) —
  read-only diagnosis; possibly just a missing-file restore.

Otherwise: pivot to a friction-driven task from real-world editor use
(log into [session-log.md](session-log.md)).

## Working-tree state

Clean.

## Substrate model state

MODEL.md unchanged. No global round / tick / simultaneity layer.
Local slot-phase coordination. Banned vocab enforced. The
2026-05-18 instance-specific naming rule is now applied uniformly:
field names directional per kind; channel ids instance-pair-specific.

## Dev-loop

After any substrate-r edit: `npm run build` (tsc alone doesn't
refresh `out/webview.js`). Live log at `.probe/webview-log.jsonl`.
Cwd for tsc/tests/check-loc/build: `tools/topology-vscode/`. Go
runtime is currently disabled in the editor UI (Run button faded);
`go build ./...` still works for sanity checks.

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
