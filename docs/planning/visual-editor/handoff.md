# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, ReadGate rename landed and verified live)

**Active branch:** `task/runtime-editor-port-alignment`. Pushed.
11 commits ahead of main.

Animation verified working in the live editor after rename
(David confirmed). Build, typecheck, `go build ./...`, Trace tests,
topogen tests all clean.

## What landed on the branch this session

Two phases on top of 6 prior scaffolding commits:

**Phase 1 — kill hardcoded port-name literals (`01a4c2c`):**

`node-kinds.tsx` no longer hardcodes `outWireRefs["out"]` etc.
Output-wire-ref lookups now derive from `NODE_KIND_PORTS` in
`tools/topology-vscode/src/webview/substrate-r/spec.ts`, which is
the single source of truth. The three-string coupling
(`port.name` ↔ edge `sourceHandle` ↔ literal in dispatch) is now
two strings.

**Phase 2 — ReadGate port rename, fully semantic (`5505974` / `d75aec5` / `8a994cb`):**

- TS: `i0In` → `value`, `i1In` → `ack`, `out` → `gated` (topology.json
  + spec.ts + node-types.ts + e2e fixtures + trace fixtures).
- Go: struct fields renamed across both sides — `FromValue` → `ValueCh`,
  `FromAck` → `AckCh`, `ToLatch` → `Gated`. `Ch` suffix on two of three
  to avoid collision with existing same-named fields (`Value int`,
  `HasAck bool`). `Gated` is clean (no collision).
- topogen registry mapping + all testdata fixtures updated.
- `nodes/Line/Line.go` bootstrap pre-send (`i1AckToReadGate <- 1`)
  also renamed.

**Hot-fix (`69a6b29`):** Phase 2 left `NODE_KIND_PORTS.readgate` at
`inputs: ["slot"], outputs: []` (the stale default). ReadGate's body
polls slot names from this table, so the bootstrap pulse reached
ReadGate but it never fired (fills arrived under `value`/`ack` while
the body looked for `slot`). One-line fix.

**Housekeeping (`c8f91d0`):** trivial e2e test description casing
(`"chaininhibitor"` → `"chainInhibitor"`) + view.json camera drift.

## Substrate clarification (worth keeping)

`bootstrap_rg` is the substrate-clean TS analog of Go's
`i1AckToReadGate <- 1` pre-send in `nodes/Line/Line.go:31`. Both
implementations need a bootstrap; Go hides it in harness wiring, TS
promotes it to a first-class topology node. The asymmetry observed
mid-session (Go "didn't need" bootstrap) was a layer confusion — Go
has it, in the setup struct rather than the graph.

Earlier mid-session diagnosis went down a wrong branch claiming Go's
ReadGate did partial-firing via `default` select. **It does not** —
Go's ReadGate accumulates `HasValue`/`HasAck` flags and only emits
when both are set, identical to TS. The 2026-05-17 partial-0 removal
(`f273f6a`, recorded in `feedback_readgate_partial_0_is_spec`) is the
spec for both runtimes.

## NODE_KIND_PORTS audit result

Audited every kind for the same staleness class that bit ReadGate.
**Clean.** All other bodies resolve slot names parametrically via
`slotIds` / `nodePorts()` with per-node `ports` override fallback;
ReadGate's body was the one that read NODE_KIND_PORTS directly.

## Parked follow-ups (from prior session)

1. **ChainInhibitorBody `useState(null)` display state** — parallel
   to the real `held` slot; can be deleted.
2. **ring-5node.json e2e fixture** — was migrated to renamed ports
   as part of Phase 2; verify it still uses the post-rename schema
   if touched.
3. **Topogen one-shot Input** (`repeat=false`): TS only; Go side
   currently disabled (Run button faded).
4. **`held=null` visual ambivalence**: tolerated.

## Next concrete step

Branch is ready to merge into `main`. Suggested final steps:

1. Quick visual sanity pass in the editor (you already confirmed
   animation works — this is a "click around once more" step).
2. Merge `task/runtime-editor-port-alignment` into `main`
   (sign-off required per CLAUDE.md). Delete local + remote branch.
3. Update `feedback_readgate_partial_0_is_spec` memory if anything
   in the rename touches that contract (it doesn't, but worth a
   re-read).

Alternative: pick a parked follow-up (item 1 is mechanical and cheap).

## Working-tree state

Clean.

## Substrate model state

MODEL.md unchanged. No global round / tick / simultaneity layer.
Local slot-phase coordination. Banned vocab enforced.
The 2026-05-18 instance-specific naming rule is now applied to
ReadGate as well as ChainInhibitor.

## Dev-loop

After any substrate-r edit: `npm run build` (tsc alone doesn't
refresh `out/webview.js`). Live log at `.probe/webview-log.jsonl`.
Cwd for tsc/tests/check-loc/build: `tools/topology-vscode/`.
Go runtime is currently disabled in the editor UI (Run button
faded); `go build ./...` still works for sanity checks.

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
