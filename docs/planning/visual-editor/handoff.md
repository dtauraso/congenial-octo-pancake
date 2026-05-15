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

**Active branch:** `task/self-scheduling-nodes`. Forked from
`task/substrate-slot-in-node` after the concept-bounded refactor
landed. One precursor commit on the new branch (`854359f`) landed the
trace-logging plumbing that had been sitting unstaged in the working
tree.

117/117 vitest green and tsc clean at the previous branch tip. The
new commit only adds optional `traceId` props + `postLog` calls;
behavior unchanged.

## Why this branch exists

User-driven session pinned a substrate bug: a Source node's emission
cadence is coupled to peer-source pulse arrival even though the
slot-in-node model says it shouldn't be.

**Topology (from [topology.json](../../../topology.json)):**

```
in08 ──► readGate.chainIn
              │
              ▼
        readGate.out ──► i0 ──► i1 ──► readGate.chainIn2
```

**Observed (from `.probe/webview-log.jsonl`, ts in ms):**

```
025959  readgate.fire + consume chainIn + consume chainIn2 + load readGate.out
        ↑ chainIn now empty, in0 wire empty. in0 should fire next round.
029143  deliver readGate.out → i0 consume → load i0.out
030859  deliver i0.out → i1 consume → load i1.out->chainIn2
038242  deliver i1.out → fill chainIn2 → trace.input.fire in08 (FINALLY)
```

Between ts 025959 (consume) and ts 038242 (in0 fires), in0's `run`
is not called at all — no `trace.input.skip` either. in0 fires in
the *same millisecond* as the i1 pulse arrives.

**Cause:** [useTickDriver.ts:43-91](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts#L43-L91)
gates `run()` invocations on a global round-close
`wires.every(w => w.phase.kind === "empty")`. While the
readGate→i0→i1→chainIn2 loop has any wire in-flight, no node's
`run()` is invoked. The driver IS a central walker.

**Model invariant violated:** [MODEL.md:70-72](../../../MODEL.md#L70-L72)
says "Driver: self-scheduling nodes + one global play/pause gate.
Nodes fire when their preconditions hold... No central walker." And
[MODEL.md:31-39](../../../MODEL.md#L31-L39): "Source node observes
readiness by reading `dest.slotPhase(slotId)` directly... It is free
to load again when that returns `empty`." A Source's emission MUST
NOT depend on peer-source state. Currently it does — transitively
through the global round-close.

User's stated principle (verbatim): *"in0->readGate pulse firing
depends on the in0->readGate wire to be empty and the in0->readGate
slot on readGate to be empty. this process has nothing to do with
i1."* And: *"both source nodes are allowed to send their pulse when
each sources slot is empty. a source node does not depend on another
source node to finish."*

The substrate-vs-coordinator bias surfaced again — see
[memory/feedback_substrate_vs_coordinator_bias.md](../../../memory/feedback_substrate_vs_coordinator_bias.md).
The global round-close looked like a clean tick definition; it's
actually a coordinator.

## Next move — the judgment call (settle BEFORE touching code)

The driver rewrite is mechanical once the model question is settled.
The model question is: **what is a tick under self-scheduling?**

### Constraints the answer must satisfy

1. **Decentralized.** No central walker. No global round-close gate.
   No node consults a coordinator to decide whether to fire.
   ([MODEL.md:70-72](../../../MODEL.md#L70-L72))
2. **Observable in the edges, not stored.** A tick is a property of
   activity, not a counter on any node or driver.
   ([MODEL.md:63-68](../../../MODEL.md#L63-L68))
3. **Source independence.** in0 fires when its own wire is empty AND
   its own dest slot is empty. Nothing else. No transitive coupling
   to peer sources through the tick definition.
4. **Step / pause / resume still work.** The pause axis is the one
   centralized thing the model allows; step needs to advance
   "something" by "one tick." If a tick isn't a global round, what
   does "step" mean?

### Candidate framings (each has a cost)

- **A. Tick = wall-clock frame.** Each RAF frame is a tick.
  Self-scheduling nodes fire whenever their preconditions hold; the
  tick counter increments off the frame loop. *Cost:* couples tick
  semantics to display refresh; "step one tick" advances time, not
  causality. Loses the "edge cohort" property entirely.
- **B. Tick = per-edge.** Each edge has its own tick counter,
  incremented when that edge transitions empty → in-flight. No
  global tick. *Cost:* "the tick" of the system doesn't exist;
  step/pause must operate per-edge or per-cascade.
- **C. Tick = cohort (deferred design).** A tick is a maximal set of
  edges that fired causally-simultaneously. Observable by walking
  edge timestamps after the fact. See
  [docs/planning/cohort-future-feature.md](../cohort-future-feature.md).
  *Cost:* the original cohort design was retired as a foot-gun; this
  re-derives it. Step is hard — you can't pre-commit to a cohort
  boundary, only observe it.
- **D. Tick = self-scheduling node-fire count.** Each node fires
  when ready; the tick is the count of fires anywhere. *Cost:*
  trivially monotonic but meaningless as a causal layer.

The retired cohort design (C) is the one MODEL.md gestures at. The
question is whether a v1 self-scheduling driver needs a tick
*concept* at all, or whether tick-counting becomes a post-hoc
observation layer over a substrate that just runs.

### Step semantics under self-scheduling

Step today = "run one round of run() calls, wait for all wires
empty, then pause." That definition dies with the global round.
Re-deriving step means deciding what one unit of advance IS when
nodes are independently scheduled. Possible framings:

- Step = advance until the next wire transition (any edge).
- Step = advance until the next node fires (any node).
- Step = advance until the system reaches the next quiescent state
  (no in-flight wires anywhere). This is today's round-close but
  triggered only by step, not by every advance.

The third reproduces today's pause-step UX without making it the
substrate's heartbeat. Probably the right answer, but flag for user
review — it's the user-visible contract.

### What "settled" looks like

Before any code change to `useTickDriver`, the next session should
produce a 5–15-line answer in the handoff (or a sibling doc) of the
form: "A tick is X. Step means Y. Tick counter lives Z." With those
three pinned, the rewrite is editable in ~an hour.

**Carried items from prior branch:**
- R4: substrate-up-the-stack import in `RSubstrateEdge.tsx`
  (`dashForKind`, `markerEndUrl` from `../rf/`).
- R5 (watch-only): `app.tsx` coupling.
- Retire `ChainInhibitor`'s `⇢` debug button — not a source, should
  not have source powers.
- `task/in0-readgate-emission-ack` parked, auto-retire signal hit,
  awaiting deletion sign-off.

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** "Decentralized" = no center
  exists, the property is genuinely local. The current global
  round-close is a center; the fix removes it.
- **Substrate vs coordinator bias.** Channels back-pressure locally;
  gates back-pressure locally. Coordinator-shaped fixes
  (round-walkers, global gates, batched ticks) are training-data
  drift. Industry's default for "schedule N things deterministically"
  is a walker — wrong for this substrate.
- **Concept-bounded code, not layer-bounded.** substrate-r/ files are
  one per model concept. Driver is a concept; if it grows, do not
  split along technical-role axes.

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
[useTickDriver.ts](../../../tools/topology-vscode/src/webview/substrate-r/useTickDriver.ts).
After any substrate-r edit, run `npm run build` —
vitest/tsc alone don't refresh `out/webview.js` (stop-hook does, but
only when bundled TS changed and the output is older than the
input).

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
