# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

handoff.md is exempt from the 100-LOC budget.

---

## State at handoff (2026-05-18, grow-port-on-drop landed)

**Active branch:** `task/grow-port-on-drop`, one commit ahead of
`main`, pushed. Working tree has unstaged edits in `memory/MEMORY.md`,
`topology.json`, `topology.view.json` — user's in-editor state plus a
memory-index pruning. **Do not commit these to this task branch.**

Unmerged sibling branch `task/editor-friction-pass-4` (three commits:
Input init seed, delete-handler immer-draft fix, delegation-nudge
inlined into CLAUDE.md) is still outstanding against main.

## What landed on this branch

- `a6230a1` **feat(visual-editor):** grow input port on wire drop onto
  saturated node. When every declared input on the destination is
  already connected, dragging a wire over the node surfaces a green
  dashed ghost handle at the nearest free of-12 snap positions under
  the cursor. Dropping creates a new port in `node.inputs`
  (auto-named `in0`, `in1`, …; kind mirrors the source port) and the
  connecting edge in one action. Files: `port-rim-drag.ts`
  (`__grow:<side>:<slot>` codec), `port-rim-grow.tsx` *(new —
  `useGrowSnap` hook + `GrowHandle` component)*, `PortRim.tsx`,
  `_use-edge-handlers.ts` (`isValidConnection` allows `__grow:`
  ids), `_on-connect.ts` (decode grow handle, append port, resolve
  target name, create edge). Per-instance `node.inputs` was already
  in the schema and round-trips via `parseNode` / `validatePorts` —
  no schema-parser changes needed.

  Scope note: grow affordance is gated by `inputs.length > 0`, so
  `Generic` and `Input` (zero declared inputs) never grow. User
  confirmed leaving this as-is; revisit only if drag-into-`Generic`
  becomes a friction.

## Next action

None queued. Drive the editor and let friction pick the next task.
Two open friction signals still worth watching (carried from
friction-pass-4 — note those fixes are not yet merged into main):

- **Inert nodes by construction.** A `ReadGate` with no outgoing
  `out` edge bails on `!wire` and silently no-ops — no visual signal
  that it's dead. Candidate fix per
  `feedback_enforce_required_inputs`: model-enforced required
  output, or a visual "inert" indicator.
- **Process hygiene.** A prior session landed two commits directly
  on `main` before being caught. Start each new task by checking out
  a fresh `task/...` branch off `main`, not by committing on
  whichever branch HEAD happens to be on. (This session did so
  correctly, stashing WIP through the branch switch.)

## Parked (not open; revisit when friction returns)

- **Grow port on zero-input nodes** (decided 2026-05-18 not to do).
  `Generic`/`Input` can't grow today; user accepted this.
- **Wire-grab feature** (discussed 2026-05-18). A wire whose path
  animates with the pulse, plus a node that "grabs" the wire and
  hands the endpoint off — runtime topology mutation. Visual-only
  half is ~1 day; handoff half needs a substrate-model answer first
  (what "held" means locally, what triggers grab/release, whether
  dangling endpoints are legal). Cheapest discovery move: build the
  visual-only animation, author a held wire by hand in
  `topology.json`, use the breakage list as the design spec.
- **Fan-out back-pressure on ChainInhibitor** still unsolved. Naive
  `wire.canAccept && inhibitWire.canAccept` gate broke animation
  both times tried. Trace deadlock if retried.
- **Pacing-by-pixel-length / wire-length-dependent firing** — item 9
  in [recommendations.md](recommendations.md). 2026-05-17 audit
  found no active firing-rule divergence; two artifacts noted (dead
  `fanout-convergence.ts` reads `wire.phase`; ChainInhibitor's
  two-load pattern can lose the `inhibitOut` token, masked today by
  wire lengths making both wires accept on the same frame). Do NOT
  reach for a clock primitive, barrier, or sequence-tagged values;
  MODEL.md has no logical-tick view.

## What's actually working

- End-to-end ring animation with real input values flowing through.
- ReadGate pass-through emits `slots[0]`'s consumed value.
- Edge seed delivers once to dest slot at wire mount.
- Drag-to-move ports: 12 snap positions, swap on collision, edges
  follow via `updateNodeInternals`.
- Wire drop onto a saturated node grows a new input port at the
  nearest free snap position; round-trips through save/reload.
- `tsc --noEmit` clean; `npm run build` clean; `check:loc` clean;
  `check-substrate-vocab.mjs` clean. 10 pre-existing e2e failures
  unchanged by this branch (carried from main; not caused here).

## Substrate model state

MODEL.md (as of 2026-05-17 / `485f041`) has no global round, tick, or
simultaneity layer. Coordination is local via slot phases. Any
reasoning that reaches for a clock primitive, barrier, sequence-tagged
values, or "logical view" is drift — the substrate has one view.
Banned vocabulary includes tick/round/step/cohort/lap; the vocab check
script enforces this in substrate-r/.

## Dev-loop

After any substrate-r edit: `npm run build` (tsc alone doesn't refresh
`out/webview.js`). Live log at `.probe/webview-log.jsonl`; clear with
`: > .probe/webview-log.jsonl` between runs (NOT before reading the
current run). The log is currently >500 MB — worth clearing when
convenient.

Cwd for tsc/tests/check-loc/build: `tools/topology-vscode/`.

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
