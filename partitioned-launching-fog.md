# What speeds would conflict if the substrate and animation layers were integrated?

## Context

Today the substrate has two clocks running side-by-side, coupled at exactly two function calls per wire (`load` in, `tryFinalize` out — Wire.tsx:227 and Wire.tsx:297–300):

1. **Machine-speed substrate layer** — synchronous; `canAccept → run → emit → fill` resolves in a single JS tick. 125 contract tests drive this layer directly and use `arcLength: 0` to collapse the animation to a single RAF tick.
2. **Human-speed animation layer** — RAF-driven pulse at `PULSE_SPEED_PX_PER_MS = 0.08` (~80 px/sec). Pause-axis halts both layers because phase can't progress while animation is frozen.

The hypothesis under examination: **integrating the two layers would make new features easier to add.** This document enumerates the speeds that would come into conflict if the layers were collapsed into one — so the cost of integration is named before any code moves.

Two integration shapes are considered: (i) **flat integration**, where animation completion is the substrate's only clock; (ii) **control flows as timing blocks**, where the topology's own control-flow structure (fan-outs converging, Join inputs filling, lateral inhibits meeting their gate) supplies the substrate's tick events, and the "speeds" in §1–7 are observed durations between control-flow events rather than independent clocks. The seven-speed analysis below holds for both; the per-section "conflict status" notes call out where the two shapes diverge. The control-flow proposal gets its own treatment after §7.

## The seven speeds in play

### 1. RAF frame rate (~16 ms / frame, ~60 Hz)
The browser's `requestAnimationFrame` callback fires once per display refresh — nominally 60 Hz on most monitors, 120 Hz on newer ones, throttled to ~1 Hz when the tab is backgrounded. Wire.tsx:290–303 advances `distanceCovered` by `elapsed * PULSE_SPEED_PX_PER_MS` each frame. The pulse therefore moves ~1.3 px per frame at 60 Hz on a 0.08 px/ms wire.

**Why it's a speed:** it's not under our control. It's the OS compositor's clock. Tabs in background, low-power mode, slow displays, and devtools-paused JS all skew it. Today this only affects the *visual smoothness* of the pulse — the substrate doesn't care. Under integration, the substrate's tick rate becomes a function of the user's monitor refresh and tab focus state, which is the wrong dependency for a computational substrate.

### 2. Substrate cascade rate (animation-paced in production)
A node's `run()` (Node.tsx:64–97) fires synchronously the moment a slot fills. If `run()` calls `wire.load()`, the wire's phase flips to `in-flight` in the same call stack — but `wire.load` does **not** synchronously deliver. Delivery waits on animation completion: the RAF loop advances `distanceCovered` (Wire.tsx:290–303); when `distance >= measuredLen`, `animDoneRef = true` and `tryFinalize()` runs (Wire.tsx:297–300); `tryFinalize` calls `deliverIfPending()` → `destNodeRef.current?.fill(destSlotId, value)` (Wire.tsx:212–225).

**This means every cross-wire hop is animation-paced in production.** The "atomic cascade" framing only holds in tests, where `arcLength: 0` collapses animation to one RAF tick. In production a 5-hop cascade is a 5-step procession, each step paced by the wire's actual geometry. The doc's earlier framing of this as a *cost* of the control-flow model was wrong — it is already how the production substrate works.

*Under control-flow timing*: nothing changes about this behavior. The model and the visible behavior already agree. What changes is that the firing rule is *named* as a control-flow event, making the semantics explicit.

### 3. Per-wire geometric duration (`arcLength / PULSE_SPEED_PX_PER_MS`)
Each wire's pulse takes `pathLength_px / 0.08` ms. A 200 px straight wire: 2.5 seconds. A 600 px snake routed around obstacles: 7.5 seconds. The `arcLength` is measured live from the SVG path (Wire.tsx:286) so route changes (`line`/`snake`/`below`) and layout changes both change pulse duration.

**Why it's a speed conflict in disguise — even today:** two wires loaded in the same machine tick will deliver at different real times if their paths differ. The B1 ChainInhibitor fan-out test relies on R-decision "lockstep fan-out" — both `out` and `inhibitOut` load atomically (Wire.tsx, kind body in node-kinds.tsx). The substrate is satisfied because *load* is atomic. But the *visible arrival* at the two destinations isn't, because `out` might be a short straight wire and `inhibitOut` might snake under the canvas. The animation already lies about simultaneity; the substrate covers for it.

Under flat integration, the substrate inherits this lie. "Lockstep fan-out" becomes geometrically false, and the C1 single-winner-exclusion problem (already accepted as weakened contract per handoff) gets worse: which IRG.right sees the inhibit first now depends on layout, not topology.

*Under control-flow timing*: this conflict **resolves**. Fan-out completion is a control-flow event — "both arrived" — that fires when the slower wire actually delivers. The substrate stops claiming simultaneity at load time and instead waits for the convergence event. C1 becomes a contract about which control-flow path completes first, which is geometrically determined and visible to the user, not hidden in a substrate atomicity claim.

### 4. Test-harness step rate (`flushRaf` = 50 ms fake-timer advance per call)
`_harness.ts` lines 21–44 use vitest fake timers. `flushRaf()` advances the clock 50 ms — enough to clear one RAF tick under fake-timer semantics. `flushRound()` calls `flushRaf` in a loop until `postLog` activity stabilizes (no new logs in a tick = round closed). Fixtures set `arcLength: 0` (line 12 of `_fixtures.ts`) so the very first RAF tick satisfies `distance >= measuredLen` and animation completes instantly.

This gives tests two superpowers:
- **Determinism**: no real wall-clock, no flaky timing, 125 tests run in a few seconds.
- **Stepwise observation**: between `flushRaf` calls, the test can inspect intermediate state (which wire is in-flight, which slot is filled).

**Why it's a speed:** flat integration forces a choice with no good answer:
- Run tests at real RAF speed: 125 × ~2s = ~4 minutes/suite, plus flakiness from real `requestAnimationFrame` jitter and `getPointAtLength` quirks.
- Keep `arcLength: 0`: the "integration" is fictional; tests are still on the old machine-speed path.
- Add a global "instant mode" flag the substrate consults: that *is* a two-layer split, just renamed.

*Under control-flow timing*: tests need a new primitive — `flushToNextControlFlowEvent` — that advances to the next firing/arrival/convergence event in the topology. Determinism is preserved (control-flow events are discrete and computable from the spec), but `flushRaf`/`arcLength: 0` no longer model the substrate correctly. The harness already has the building blocks: `flushRound` stops when `postLog` activity stabilizes, which is essentially "no more control-flow events fired" — so the migration path exists, but every fixture using `arcLength: 0` needs review.

### 5. Self-sustaining cycle rate
CLAUDE.md describes two modes: **disruption mode** (external input perturbs a running system — built first) and **self-sustaining mode** (partitions cycle continuously — layered on top). Self-sustaining mode means a closed loop of nodes (e.g., 4-node partition) keeps pulses circulating without external drive.

**In production, cycles already run at wire-duration speed.** One cycle = `sum(wire_durations)` ≈ 5–10 seconds for a 4-node loop. The substrate is not "machine-speed" in the editor for self-sustaining topologies — it was already a kinetic sculpture. The earlier framing of this as a cost of the control-flow model was wrong; it describes the existing behavior.

**This does not threaten the constant-time algorithmic goal**: that goal is about the topology's structural complexity (how many cycles to converge as a function of input size). A topology that converges in O(1) cycles converges in O(1) cycles regardless of whether each cycle takes 1 ms or 5 seconds to display. Characterization runs happen against the Go runtime, not the React editor.

*Under control-flow timing*: a self-sustaining cycle has a well-defined period — the sum of its wire durations around the loop. The period is geometrically determined and visible to the user. Nothing about this is different from the current production behavior.

### 6. Per-wire-prop speed (hypothetical future feature)

> **Status: tried and rejected.** A per-wire `speed` prop was implemented in commit 33093ca and reverted in cafdcc7 on user feedback. The argument below — that this is "the strongest evidence in favour of the control-flow model" — was invalidated by that experiment. Pulse speed is uniform across all wires; heterogeneous timing is achieved at the topology level (fan-out convergence, different wire lengths), not via a per-wire speed knob. See `memory/feedback_uniform_pulse_speed.md` for the decision record. The section is preserved as historical analysis.

A user might reasonably want: "inhibit signals travel at 2× data-signal speed" — semantically meaningful, since lateral inhibition arriving *before* the value lets the inhibitor preempt. This makes `speed` a per-wire `RWireSpec` property (spec.ts) rather than a global constant.

Today this is harmless because animation is decorative. Wires can have any per-prop speed without affecting substrate correctness.

**Why it's a speed conflict under flat integration:** the substrate currently assumes there is *one* time. `canAccept` returns a boolean; the slot is empty or filled; no notion of "filled at t=2.1s." If each wire has its own speed, then "what fired first" depends on per-wire travel times, and the substrate must reason about *relative arrival ordering* across heterogeneous wires. That is exactly what the machine layer exists to abstract away — and the abstraction breaks the moment per-wire speed is a substrate variable.

*Under control-flow timing*: this conflict **resolves cleanly**. Per-wire speed just changes how long a wire takes to fire its arrival event; the substrate observes events in the order they actually happen, not in a continuous-time race that has to be linearized. "Inhibit travels faster than data" becomes a per-wire `speed` prop that directly affects the order of control-flow events, with no abstraction breakage. ~~This speed is the strongest evidence in favor of the control-flow model.~~ (Argument invalidated — see status note above.)

### 7. User pause granularity
The pauseAxis (pause-axis.ts) is a global observable boolean. When paused: RAF stops (Wire.tsx:291), the pulse freezes mid-flight at its current `pulsePos`. On resume: the sim clock rebases (Wire.tsx:307) so the pulse continues from the frozen position rather than jumping forward.

Because animation completion drives delivery, and delivery drives the substrate's next firing decision, pausing the animation also freezes the substrate. The two layers happen to be synchronized through pause today — but only because the substrate is downstream of the animation for *delivery timing*.

**Why it's a latent speed:** today a developer could (in principle) run tests during animation pause — the test harness calls `complete()` or relies on `arcLength: 0`, neither of which touches the pauseAxis. This is occasionally useful: inspect a paused canvas, then poke the substrate via the test API. Under integration, pause freezes everything uniformly. That sounds clean, but it removes the "freeze the visual, advance the logic" debugging affordance that the two-layer split implicitly enables.

There's also a subtler granularity issue: pause-mid-pulse leaves the wire phase `in-flight` and the slot `empty`. `canAccept` for that wire returns `false` (Wire.tsx:246–251). Resume from pause re-enters the RAF loop and eventually delivers. But if the *substrate* is integrated, then "what does `canAccept` mean during pause?" becomes ambiguous: is the system halted, or is it running infinitely slowly? The two interpretations differ for things like edge-triggered subscriptions.

*Under control-flow timing*: pause halts the RAF tick; all in-flight wires freeze mid-pulse and no new control-flow events fire. Substrate state at pause is well-defined: "the set of events that have completed so far." The freeze-visual/advance-logic debugging trick is lost, but state inspection is clean — the user can see exactly which control-flow paths are mid-traversal.

## Why the layer boundary is not where the fix belongs

It's tempting to look at Wire.tsx (343 LOC, straddles both layers) and conclude that the boundary itself is the problem — that if the substrate and animation were "more integrated" (or, dually, more separated), feature work would get easier. Both directions are wrong, for the same reason: **the boundary is not where the cost is.**

### The boundary is already near-minimal

A wire today has exactly two cross-layer function calls:
- `load(value)` — substrate → animation: "start a pulse."
- `tryFinalize()` via `animDoneRef = true` — animation → substrate: "deliver and become empty."

That's it. There is no shared mutable state, no callback web, no observer chain crossing the boundary. The substrate cannot see `pulsePos`; the animation cannot see slot phase. The reducer (`wirePhaseReducer`, Wire.tsx:48–57) is pure and has no animation references. The RAF loop (Wire.tsx:278–314) reads `phase.kind` but writes nothing back except through `tryFinalize`. **You cannot make this interface smaller without making one layer subsume the other.**

### The real friction is elsewhere

The pain points cited in this session — "5 files to add an animation feature," "wire props have to be threaded twice" — are not at the substrate/animation boundary. They are at the **spec → render plumbing fork**:

- `RWireSpec` declares the prop (spec.ts).
- `TopologyRoot` threads it from validated spec into `<Wire>` (test/spec path).
- `RSubstrateEdge` threads it from React Flow `data` into `<Wire>` (editor path).

Wire.tsx itself is *one* file in that chain. The other two threading sites are the dual-path fork CLAUDE.md still calls out as un-collapsed. The node-kind side of this fork was already collapsed once via `renderKindBody`, dropping per-feature edits from ~4 files to ~2. The same move is available for wire props (a shared `threadWireProps` helper) and would have the same effect, **without touching the machine/human boundary at all.**

### Moving the boundary makes things worse, not better — except in one direction

Three refactors to weigh:

**(a) Flat integration — make animation completion drive substrate decisions everywhere.** This is what "merging the layers" sounds like. It collapses the two function calls into zero (animation just *is* substrate progress). But: now every speed in §1–7 must be reconciled into one clock. Tests need a parallel "instant mode" that *is* the old machine-speed layer in disguise. Cascade depth becomes real time, violating constant-time goals. Per-wire speed becomes incoherent. The boundary doesn't disappear — it relocates inside a single overloaded clock, which is harder to reason about than two named clocks with one bridge. **Fails.**

**(b) Stricter separation — extract animation into a sibling file (`wire-pulse.ts`).** This is what "cleaner layering" sounds like. Wire.tsx becomes pure substrate; `wire-pulse.ts` becomes pure animation. But: the bridge is still two function calls — now they're cross-file calls instead of cross-section calls in one file. Re-projection cost rises (read two files to understand one wire); the dual-path fork is unchanged; the speeds in §1–7 are unchanged. The substrate-r carve-out in CLAUDE.md explicitly warns against this: concept-bounded files beat technical-role files. A wire is one concept; splitting it by layer fragments the concept. **Fails.**

**(c) Control flows as timing blocks.** This is the user's proposal and the one that doesn't fail like (a) and (b). It does not collapse the two clocks into one shared display-paced clock (so it preserves the substrate's separation from display refresh), and it does not split the wire concept across files (so it preserves the carve-out). Instead it makes the topology's own control-flow events — fan-out arrivals, Join input fills, lateral inhibit/gate convergences — *be* the substrate's tick. The "speeds" in §1–7 are no longer independent clocks competing for authority; they are observed durations between control-flow events, with the events themselves as the only privileged moments. The boundary changes meaning: rather than "one bridge per primitive," it becomes "the control-flow event schedule that the topology defines." That is a substrate-shape change rather than a refactor, and it has real costs (§2 cascade is no longer atomic; §4 test harness needs a new primitive; §5 self-sustaining mode needs a separate fast-evaluation path) — but the failures characteristic of (a) and (b) don't apply. **Earns its own frame.**

### What the boundary is actually for

The two-layer split is the *current* architecture's answer to **"how can the same topology run at constant time for computation and at human-readable speed for inspection?"** The answer is: two clocks, two purposes, one bridge per primitive. That bridge is the *only* place the two purposes have to agree, and they agree on exactly one fact ("the pulse arrived") which both layers natively understand. Refactors (a) and (b) degrade this answer without addressing the friction the user actually feels.

Refactor (c) **gives a different answer to the same question**: the visible substrate and the computational substrate become the same graph paced by control-flow events; constant-time computation moves to a separate fast-evaluation path that shares the topology but not the pacing. Human-readable speed becomes the substrate's natural tempo rather than a parallel display layer. Whether (c)'s answer is better than the current one is a model decision, not a refactor decision — and it's the only direction in which moving the boundary is coherent.

For ergonomic friction *without* changing the substrate shape: the fix-point is the **wire-prop dual-path fork**, not the layer boundary.

## A third option: control flows as timing blocks (largely already present)

The original framing of this document assumed only two architectures: keep the two-clock split (current), or collapse to one clock (integration). There is a third architecture — and as §2 and §5 now make clear, **it is largely already how the production substrate works.**

**The model**: use the topology's own control flows as the timing blocks. Each control-flow event — a node fires, a wire arrives, a fan-out converges at its destinations, a Join sees its inputs filled, a lateral inhibit reaches its gate — *is* a substrate tick. The seven speeds in §1–7 are not independent clocks competing for authority; they are observed durations between control-flow events. "Where the tick marks line up" is where the topology's structure says they line up: fan-out convergence, Join completion, inhibit/data meeting. This is not "merge into one clock"; it is "let the control flow define the schedule, and the animation reveals it."

In production, this is exactly what happens. `wire.load(value)` marks the wire in-flight (Wire.tsx:227–233). The RAF loop advances `distanceCovered` (Wire.tsx:290–303). When `distance >= measuredLen`, `animDoneRef = true` and `tryFinalize()` fires (Wire.tsx:297–300). `tryFinalize` calls `deliverIfPending()` → `destNodeRef.current?.fill(destSlotId, value)` (Wire.tsx:212–225). Every cross-wire hop is gated on animation completion. The bridge is already there.

Reading this against the seven speeds:

### Where it fits naturally

- **§3 Per-wire geometric duration**: each wire's arrival event happens when its pulse completes. Fan-out convergence is the explicit "both arrived" event, which fires when the slower wire delivers — no claim of simultaneity at load time. The B1 R-decision becomes a literal statement about a control-flow event, not a fiction. C1 single-winner becomes a contract about which control-flow path completes first, geometrically determined and visible.
- **§6 Per-wire-prop speed**: directly supported. Per-wire `speed` changes when each wire's arrival event fires; the substrate observes events in order of actual completion. No continuous-time race for the substrate to linearize; no `t=2.1s` reasoning required. This is the strongest single argument for the control-flow model.
- **§1 RAF frame rate**: RAF is the medium that carries control-flow events to the user, not the substrate's clock. Browser-dependence affects how *fast* events appear, not whether they happen — which preserves the model's correctness under tab-throttling, low-power mode, etc.
- **§2 Substrate cascade rate**: already animation-paced in production (see §2). No change. What changes is only that the firing rule is named.
- **§5 Self-sustaining cycle rate**: already wire-duration-paced in production (see §5). No change. Algorithmic constant-time goal lives in the Go runtime, not the editor.

### What's not costs — what's already there

The previous version of this section listed §2 and §5 under "Where it strains." That framing was wrong. The production substrate already behaves this way. The only items that genuinely require additions:

- **§4 Test-harness step rate**: tests use `arcLength: 0` to collapse animation to one RAF tick and `flushRaf(50ms)` to advance the clock. Under the formalized control-flow model, `arcLength: 0` stops meaning "bypass animation" and starts meaning "collapse visible duration." The `flushRound` utility (stop when log activity stabilizes) is already essentially `flushToNextControlFlowEvent` in disguise. **Test migration is sequenced last — see "Test cleanup happens last" below.**
- **§7 User pause granularity**: pause freezes all in-flight wires; substrate state is "the set of completed events so far." Clean, but loses the freeze-visual/advance-logic affordance.

### Three additions needed to formalize what's already present

The control-flow model is largely operative. Three small additions make it fully expressive:

1. ~~**Per-wire `speed` prop on `RWireSpec`** (~15 LOC): consumed by Wire.tsx instead of the global `PULSE_SPEED_PX_PER_MS = 0.08` constant.~~ **Tried and rejected** (implemented 33093ca, reverted cafdcc7). Pulse speed is uniform; heterogeneous timing is expressed through topology structure (wire geometry, fan-out convergence), not per-wire knobs.
2. **Fan-out convergence as an observable event** (§3 / C1): a small helper that subscribes to both wires of a fan-out and fires once both have delivered. **Landed** (commit 9bea44c).
3. **Reframe `arcLength: 0` in test documentation**: same mechanism, cleaner semantics — "collapse visible duration but keep control-flow event ordering," not "bypass animation." **Landed** (commit 1e8eeff).

### What this changes about the recommendation

My earlier framing — "do not integrate; the boundary is load-bearing" — was correct for the *flat* integration the question first suggested. The control-flow-as-timing proposal is a different shape: it does not collapse the two clocks into one display-paced clock, and it does not split the wire concept across files. It makes explicit what the production substrate already does.

This earns a real response, not a dismissal:

- It *does* let new animation features land without re-deriving substrate semantics, because the control flow IS the substrate semantics.
- It *does* address the geometric-simultaneity lie (§3) and the per-wire-speed coherence problem (§6).
- It *does* match the model's existing vocabulary: `canAccept` becomes a per-wire precondition checked at each control-flow event, which is close to its current meaning.
- It *does not* cost the constant-time algorithmic property at all — that property lives in the encoded topology and is verified at the Go runtime, not in the React editor's pacing.
- It *forces* a MODEL.md update: the firing rule becomes "control-flow event," making explicit what was previously implicit.

That is a substrate-shape formalization, not a refactor. It belongs in a named frame with its own handoff, not in this analysis doc.

## The fundamental conflict (resolved)

The conflict I originally described — "substrate must be constant-time vs animation must be human-paced" — was based on a misreading of CLAUDE.md. The constant-time property is about the *encoded algorithm* (how many control-flow events the topology takes as a function of input size) and is verified at the Go runtime, not the React editor.

The production substrate is already animation-paced. The "fundamental conflict" was a phantom: there is no conflict between the substrate being control-flow-paced and the animation being human-paced, because they are the same thing in production. The only remaining choice is whether to name and formalize this explicitly in the model.

## What integration would actually buy

The "easier feature work" intuition is real, but it is mis-localized. The friction is **not** at the layer boundary (one bridge per primitive, near-minimal). The friction is the **wire-prop dual-path fork**: every animation prop must be threaded through `spec → TopologyRoot → Wire` AND `spec → RSubstrateEdge → Wire`. That fork is mechanical and has been solved once already (the `renderKindBody` collapse for node kinds). Collapsing it for wire props gives 2-file features instead of 5-file features without touching the machine/human boundary.

## Recommendation (revised)

The original "do not integrate" recommendation was partly defended on a misreading of the constant-time goal and a misreading of the production substrate. With both corrected, the editor architecture has two reasonable directions:

**Stay (collapse the wire-prop fork).** Lowest surface area. The 125 tests keep working unchanged. Animation features still pay the dual-path threading tax — best mitigated by collapsing the wire-prop fork via a shared `threadWireProps` helper (parallel to how `renderKindBody` collapsed node kinds). No model change; no test migration.

**Formalize what's already there (control-flow-as-timing).** Much smaller than it previously sounded. The production substrate already runs at control-flow pace. Of the original three additions, (1) per-wire `speed` prop was tried and rejected (commits 33093ca / cafdcc7 — pulse speed is uniform; heterogeneous timing lives in topology structure), (2) fan-out convergence observable event landed (9bea44c), and (3) `arcLength: 0` doc reframe landed (1e8eeff). Remaining: MODEL.md update naming the firing rule, and test vocabulary cleanup (sequenced last — see below).

The choice is: *stay and reduce mechanical friction* (collapse the fork) vs *formalize and gain model expressiveness* (per-wire speed, fan-out convergence, explicit firing rule). Neither is architectural surgery.

### Test cleanup happens last

The 125 tests rely on `arcLength: 0` to make cascades resolve within one `flushRaf(50ms)` call. Under the formalized control-flow model, that flag stops being "bypass animation" and becomes "collapse visible duration." Same mechanism, cleaner semantics. **Do not touch the tests until the rearrangement of substrate-r code is complete and stable.** The tests are the verification surface for the rearrangement; changing them in parallel makes it impossible to tell whether a failure means "rearrangement broke something" or "test migration broke something."

Revised sequence (reflecting what has landed): (1) ~~add per-wire speed prop~~ — tried and rejected (33093ca / cafdcc7); (2) ~~add fan-out convergence~~ — landed (9bea44c); (3) update MODEL.md to name control-flow events as the firing rule; (4) verify all 125 tests still pass unchanged; (5) only then migrate test vocabulary and reframe `arcLength: 0` documentation (doc reframe landed in 1e8eeff; code migration remains).

## Critical files referenced

- [Wire.tsx](tools/topology-vscode/src/webview/substrate-r/Wire.tsx) — both layers; bridge at lines 227 and 297–300.
- [pause-axis.ts](tools/topology-vscode/src/webview/substrate-r/pause-axis.ts) — pure animation layer.
- [Node.tsx](tools/topology-vscode/src/webview/substrate-r/Node.tsx) — pure substrate layer.
- [TopologyRoot.tsx](tools/topology-vscode/src/webview/substrate-r/TopologyRoot.tsx) and [RSubstrateEdge.tsx](tools/topology-vscode/src/webview/substrate-r/RSubstrateEdge.tsx) — the wire-prop dual-path fork (the actual friction point).
- [tools/topology-vscode/test/contracts/_harness.ts](tools/topology-vscode/test/contracts/_harness.ts) and `_fixtures.ts` — `flushRaf`/`arcLength: 0` machinery; would have to be redesigned under integration.
- [MODEL.md](MODEL.md) and [CLAUDE.md](CLAUDE.md) — pin the substrate model and the constant-time goal that integration would violate.
