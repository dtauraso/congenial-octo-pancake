# Integration contracts

Registry of integration-level invariants. Each row names a behavior
that crosses a boundary the unit-test suite (pure-data, `node` env)
cannot see, and points at a regression test that pins it.

## Why this exists

The 178-test unit suite covers parsing, simulator math, handlers, and
undo invariants. It runs in `environment: "node"` with no DOM. It does
not touch the React/RF integration layer, the host↔webview message
protocol, or the sim↔view bridge. Several recent regressions escaped
because they live in those layers:

- **2026-05-05 — camera snap-back during 2-finger pan** (fix in
  `task/camera-snap-back-fix`). LOC refactor changed the second arg of
  `useHostMessages` from a stable callback bag to a fresh object literal
  per render, so the message-listener effect re-ran every render and
  re-posted `{type:"ready"}`. The host responded with `view-load` →
  `setViewport` → camera snapped mid-pan. Zero unit tests fired.
- **2026-05-05 — in0 streams pulses serially** (fix in
  `task/topology-spec-slots-1`). `topology.json` was last edited before
  the May-4 `data.slots` migration and never picked up `slots: 1` on
  `inputToReadGate`. The inline `cycleSpec` in
  `test/simulator/readgate-backpressure.test.ts` had `slots: 1`, so the
  test passed while the live spec was unbounded. No round-trip test
  asserts that the saved spec preserves `data.slots`.

## Convention

A PR that introduces a behavior crossing a tier boundary (host↔webview,
hook↔RF, sim↔view, spec round-trip) adds a row here **and** a regression
test in the same commit. Refactor PRs are not allowed to remove a row's
test without explicitly amending the row.

## Tiers

**Tier 1 — host↔webview protocol.** Pure-node tests, mock
`vscode.postMessage`. Catches the snap-back / save-storm / ready-loop
class without a render tree.

**Tier 2 — React hook ↔ RF lifecycle.** jsdom + `@testing-library/react`.
Renders hooks/components in isolation, drives `window.postMessage`,
asserts effect-fire counts and RF callback wiring.

**Tier 3 — sim↔view bridge.** jsdom render of `<AnimatedEdge>` and
friends. Drive simulator emits, assert pulse-bridge mount/unmount counts
balance. CI version of the runtime leak probe.

## Registry

| ID | Tier | Invariant | Test | Origin |
|---|---|---|---|---|
| C1 | 1+2 | `useHostMessages` posts `{type:"ready"}` exactly once per mount, regardless of render count. | `test/contracts/ready-once.test.ts` (Tier-1: router posts ready exactly once per install) + `test/contracts/ready-once-hook.test.tsx` (Tier-2: `renderHook` + rerender — hook calls `installHostMessageRouter` once per mount; cleanup runs on unmount) | task/camera-snap-back-fix (d8e3c88); Tier-2 added on task/dom-substrate-happy-dom |
| C2 | 1 | A spec round-tripped through `parseSpec` → `specToFlow` → `flowToSpec` (the editor save path) preserves every edge's `data` field (slots, init, delay) and every node's `data` field. | `test/contracts/spec-data-roundtrip.test.ts` | task/topology-spec-slots-1 (628945f) |
| C3 | 1 | `view-load` host message triggers exactly one `setViewport` call per message. | `test/contracts/view-load-setviewport.test.ts` (pins `resolveViewLoadViewport` returning ≤1 viewport; the call site in `_handle-view-load.ts` reduces this to ≤1 `setViewport` per message by inspection) | task/camera-snap-back-fix (d8e3c88) |
| C4 | 3 | Under any play/pause/cycle sequence, every edge's `(noteEdgePulseStarted, noteEdgePulseEnded)` count pair balances at quiescence. The bridge must be a single `[edgeId]`-keyed effect — folding it into the `[geom, speedPxPerMs]` effect's cleanup would re-fire on every reflow. | `test/contracts/pulse-bridge-balance.test.tsx` (mounts `<PulseInstance>` under happy-dom, asserts `state.activeAnimations` returns to 0 after unmount and stays at 1 across geom rerenders) | task/pulse-bridge-leak-probe (758d883) |
| C5 | 1 | `cycle-restart.logStuckPendingOnce` fires only when `hasPendingWork(world)` is true. (Match the message to the actual condition — captured probes have shown a mismatch shape.) | `test/contracts/stuck-pending-precondition.test.ts` | .probe/runner-errors-last.json (May 4) |

## Substrate decision (open)

Tier 2/3 require a DOM environment. Dominant choices:
- **jsdom** — most-used, slow startup (~1s), wide compatibility.
- **happy-dom** — newer, ~3× faster, vitest-recommended, covers the React subset we need.

Plus `@testing-library/react` for `renderHook` / `render`.

Tier 1 (rows C1, C2, C3, C5 above) needs no DOM if we extract the
effect callback or factor the message router so a pure function can be
asserted directly. Tier 1 tests should land first; Tier 2/3 wait until
a Tier 1 gap shows itself.

**Next step (if approved):** stand up Tier 1 by extracting
`useHostMessages`'s effect body into a pure module-level function, then
add `test/contracts/ready-once.test.ts` and `view-load-setviewport.test.ts`
asserting call counts against a fake `vscode` postMessage. Then C2's
spec round-trip (already pure, no extraction needed).
