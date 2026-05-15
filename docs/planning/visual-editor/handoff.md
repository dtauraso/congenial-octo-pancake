# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget (per CLAUDE.md "File
size budget"): a fresh AI session must read it end-to-end, and audit
19 found that splitting it across siblings cost more reading time
than keeping one slightly-larger doc.

---

## State at handoff (2026-05-14, end-of-session)

**Active branch:** `task/self-scheduling-nodes`. Trace-logging
precursor commit `854359f` is in. No further code changes this
session — the session settled the model question that was blocking
the rewrite.

117/117 vitest green and tsc clean at branch tip.

## The judgment call — SETTLED this session

The driver question was: what is a tick under self-scheduling? The
session resolved it by **removing the concept**, not redefining it.

User's decisions, in order:

1. **"remove the tick."** — No tick counter, no tick concept on
   driver, nodes, or edges. Tick is not a thing in the model.
2. **"take out step."** — No step button, no step semantics. Driver
   surface shrinks to `halt` / `resume` + `pauseAxis`.
3. **"node runs the moment it receives a pulse."** — The phase
   transition event IS the trigger. No driver poll, no round walk.
4. **"the run is triggered when the pulse arrives. the node running
   does not mean it will pulse."** — `run()` is the handler invoked
   by a pulse-arrival event. Whether `run()` emits is a separate
   local decision inside `run()` based on its own outgoing
   preconditions. Running ≠ emitting.

### What that means concretely

- **Consumer/relay (relay, join, readgate, chaininhibitor):** input
  wire arrival fills a slot. The existing `Node.fill()` path already
  invokes `onRun` ([Node.tsx:64-72](../../../tools/topology-vscode/src/webview/substrate-r/Node.tsx#L64-L72)).
  This is already pulse-arrival-triggered; nothing new needed for
  consumers.
- **Source (input):** has no input wire. Its trigger must be its
  dest slot transitioning to `empty` (downstream consumed) AND/OR
  its own outgoing wire transitioning to `empty` (delivered). Source
  bodies need to subscribe to those phase events and invoke their
  own `run()` on transition.
- **Driver:** stops walking. No `for (const r of nodeRefs) r.current?.run()`.
  No `wires.every(empty)` gate. No `tick` state, no `setTick`, no
  `step`, no `stepResumeToPaused`. Keeps `halt` / `resume` /
  `pauseAxis`.
- **Transport UI:** the ⏭ step button disappears. Only ⏸/▶ remain.
- **`<span data-testid="tick">`** in TopologyRoot disappears. Tests
  asserting on tick value disappear or rewrite to assert on
  observable wire/slot state.

## Next move — implement the rewrite

The model question is settled; the rewrite is mechanical but
multi-file. Suggested staging:

**Stage 1 — source self-subscription.** Update `InputBody` in
[node-kinds.tsx](../../../tools/topology-vscode/src/webview/substrate-r/node-kinds.tsx)
to subscribe to its outgoing wire's phase transitions (to `empty`)
and invoke its own `run()` on that event. The wire's
`subscribePhase` API already exists ([useTickDriver.ts:92](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts#L92)).
Source also needs to invoke `run()` once on mount to fire the
initial pulse when wire/slot are both empty at start. Verify
in0/in1 still fire under the existing driver before removing it.

**Stage 2 — strip the driver.** Rewrite [useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts):
remove `tick`, `step`, the `wires.every(empty)` round-close, the
`advance` walker, the RAF idle throttle. Keep `halt`/`resume` and
`pauseAxis`. Rename the file to `useDriver.ts` or similar — "tick"
is banned vocabulary now ([MODEL.md](../../../MODEL.md)). Update
imports in [registry.tsx](../../../tools/topology-vscode/src/webview/substrate-r/registry.tsx)
and [TopologyRoot.tsx](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx).

**Stage 3 — UI cleanup.** Remove the step button from
[TransportControls.tsx](../../../tools/topology-vscode/src/webview/panels/TimelinePanel/TransportControls.tsx).
Remove `<span data-testid="tick">` from
[TopologyRoot.tsx:87](../../../tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx#L87).

**Stage 4 — tests.** Find tests that assert on `tick` value or call
`step()`. Rewrite to assert on wire phase / slot phase / log events
instead. Many integration tests may simplify — they no longer need
to coordinate rounds.

**Stage 5 — vocab check.** Run `node tools/topology-vscode/scripts/check-substrate-vocab.mjs`.
"tick" / "step" / "round" should be flagged anywhere they remain in
substrate-r/.

**Stage 6 — verify the original bug.** The motivating bug: in0's
emission cadence was coupled to peer-source pulse arrival via the
global round-close. With the round-close gone, in0 should fire as
soon as `readGate.chainIn` transitions to empty — regardless of
where the i1→chainIn2 pulse is. Reproduce the topology in
[topology.json](../../../topology.json), run, inspect
`.probe/webview-log.jsonl`. Expected: `trace.input.fire` for in0
appears within microseconds of `trace.consume` on readGate.chainIn,
not after the i1→chainIn2 delivery.

**Carried items (still open):**
- R4: substrate-up-the-stack import in `RSubstrateEdge.tsx`
  (`dashForKind`, `markerEndUrl` from `../rf/`).
- R5 (watch-only): `app.tsx` coupling.
- Retire `ChainInhibitor`'s `⇢` debug button — not a source, should
  not have source powers. The self-scheduling rewrite is the right
  moment: ChainInhibitor's `run()` will be triggered by slot fill;
  the manual emit button has no place.
- `task/in0-readgate-emission-ack` parked, auto-retire signal hit,
  awaiting deletion sign-off.

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** "Decentralized" = no center
  exists, the property is genuinely local. The driver's round-close
  was a center; removing tick/step removes it.
- **Pulse arrival IS the trigger.** The phase transition event on
  an adjacent wire/slot is what invokes `run()`. There is no
  scheduler. There is no walker. There is no clock.
- **Running ≠ emitting.** A node `run()` is a handler that may or
  may not pulse out. Sources can run (slot empties) and decline to
  pulse (own wire still in-flight, queue empty, etc.). Consumers
  can run (input arrives) and decline to pulse (out wire blocked,
  AND-gate not yet satisfied).
- **Substrate vs coordinator bias.** Channels back-pressure locally;
  gates back-pressure locally. The tick was a coordinator dressed
  as a model concept. Industry's default for "schedule N things
  deterministically" is a walker — wrong for this substrate.
- **Concept-bounded code, not layer-bounded.** substrate-r/ files
  are one per model concept. Driver shrinks; do not split along
  technical-role axes.

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user
  to name the next frame.
- When designing fixes, first ask: what does the Go side do?
  Channels back-pressure locally; gates back-pressure locally.
- Use Claude Code as a fabricator, not a co-designer.

See `memory/feedback_substrate_vs_coordinator_bias.md` and
`memory/feedback_visual_first_default.md`.

## Open branches

- `main` — production trunk.
- `task/substrate-slot-in-node` — concept-bounded refactor landed;
  parent of the current branch. Eligible for merge to main once
  self-scheduling work concludes.
- `task/self-scheduling-nodes` — this branch.
- `task/in0-readgate-emission-ack` — parked, deletion needs sign-off.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

Read [MODEL.md](../../../MODEL.md), the
substrate-vs-coordinator memory, and
[useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts)
(soon to be renamed). After any substrate-r edit, run `npm run
build` — vitest/tsc alone don't refresh `out/webview.js` (stop-hook
does, but only when bundled TS changed and the output is older than
the input).

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/` (Bash
resets cwd — chain `cd` or use absolute paths). Stop hook active:
`scripts/stop-checks.sh` runs go build / tsc / check:loc / npm run
build on relevant changes and blocks stop on failure. If user
surfaces unrelated friction, log to
[session-log.md](session-log.md) and open a fresh
`task/<short-kebab>`.

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
