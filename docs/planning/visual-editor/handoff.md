# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-19, Option A naming sweep complete and verified)

**Active branch:** `task/runtime-editor-port-alignment`. Pushed.
23 commits ahead of main. Animation verified working live in the
editor including the snake-edge route to `inhibitRight0`.

## What this branch contains (latest first)

- **`a79f8d0`** view.json camera drift
- **`940655c`** load-time warning + parseSpec strict-mode for orphan view-edge keys
- **`3482a0f`** fix view.json stale edge route keys (`i0.inhibitOut->...` → `i0ToInhibitRight0`)
- **`bdbd163`** edge/channel ids to `<srcInstance>To<DestInstance>` camelCase
- **`ad49deb`** TS port names to PascalCase matching Go struct fields
- **`13e1d67`** Go ReadGate struct fields back to `FromValue`/`FromAck`/`ToGated`
- **`726e976`** rename inhibitrightgate out → passed (TS + Go ToOut → ToPassed)
- **`7a23231`** rename join out → joined
- **`a59f3c8`** rename register slot → in
- **`1c4e69f`** rename relay slot → in
- **`e829673`** prior handoff snapshot
- **`c8f91d0`** e2e test casing + view.json
- **`69a6b29`** fix ReadGate NODE_KIND_PORTS staleness
- **`8a994cb`** rename ReadGate out → gated (TS + Go ToLatch → Gated)
- **`d75aec5`** rename ReadGate i1In/FromAck → ack
- **`5505974`** rename ReadGate i0In/FromValue → value
- **`01a4c2c`** refactor: derive output wire refs from spec (Phase 1)
- + 6 prior scaffolding commits (Input queue editor, Run button disable, topogen path)

## Naming convention now in place (Option A)

- Port (field) names: PascalCase directional, matching Go struct
  fields verbatim. E.g. `FromValue`, `FromAck`, `ToGated`, `FromPrev`,
  `ToNext`, `ToEdge`, `FromLeft`, `FromRight`, `ToPassed`, `FromIn`,
  `FromA`, `FromB`, `ToJoined`, `ToOut`.
- Edge / channel ids: camelCase `<srcInstance>To<DestInstance>`.
  E.g. `in08ToReadGate1`, `i0ToI1`, `i0ToInhibitRight0`,
  `bootstrapRgToReadGate1`. Same form in Go's `Wiring.go` / `Line.go`
  channel variables.
- `topology.json` ports use per-instance `ports:` override; TS
  `NODE_KIND_PORTS` defaults serve as arity-only placeholders.

## Substrate clarification (worth keeping)

`bootstrap_rg` is the substrate-clean TS analog of Go's
`i1AckToReadGate <- 1` pre-send in `nodes/Line/Line.go:31`. Both
implementations need a bootstrap; Go hides it in harness wiring, TS
promotes it to a first-class topology node.

Mid-session diagnostic detour: an earlier agent claimed Go's ReadGate
fired on partial input via `default` select. **It does not** —
ReadGate accumulates `HasValue`/`HasAck` flags and only emits when
both are set. The 2026-05-17 partial-0 removal (`f273f6a`, see
`feedback_readgate_partial_0_is_spec`) is the spec for both runtimes.

## NODE_KIND_PORTS audit result

Audited every kind for the staleness class that bit ReadGate at
`69a6b29`. Clean. All bodies resolve slot names parametrically via
`slotIds` / `nodePorts()` with per-node `ports` override.

## View-state durability (new this session)

View-edge-key orphan detection landed in `940655c`:
- `_handle-view-load.ts` warns on load with probe entry
  `view.orphan-edge-key { key, knownEdgeIds }`.
- `parseSpec(input, view?)` throws on orphan when view is threaded
  through. Editor's main load path uses the warning; future batch
  tooling can use the strict mode.

## Parked follow-ups

1. ChainInhibitor `ToEdgeNew` field is Go-only; TS substrate has no
   declaration (port `readNew` referenced only by trace fixtures).
   Either declare in TS or delete from Go as vestigial.
2. ChainInhibitor `ToAck` field generates dead-end channel vars
   (`i0ToAck`, `i1ToAck`) per topogen's `id + capitalize(field)`
   pattern; functional but inconsistent with semantic naming.
3. ChainInhibitorBody `useState(null)` display state — parallel to
   the real `held` slot; can be deleted.
4. Topogen one-shot Input (`repeat=false`): TS only; Go side disabled
   (Run button faded).
5. `held=null` visual ambivalence — tolerated.

## Next concrete step

Branch is ready to merge into `main`. Suggested final steps:
1. Run the full e2e suite (`npm run test:e2e`) for a last sanity check.
2. Merge `task/runtime-editor-port-alignment` into `main` (sign-off
   per CLAUDE.md). Delete local + remote branch.
3. After merge, optionally pick a parked follow-up; items 1 or 3 are
   the highest-leverage / cheapest cleanups.

## Working-tree state

Clean.

## Substrate model state

MODEL.md unchanged. No global round / tick / simultaneity layer.
Local slot-phase coordination. Banned vocab enforced. The
2026-05-18 instance-specific naming rule is now applied uniformly:
fields directional per kind; channels instance-pair-specific.

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
