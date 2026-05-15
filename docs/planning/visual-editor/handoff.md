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

**Active branch:** `task/self-scheduling-nodes`. All stages complete.
Commits in:

- `854359f` — trace-logging precursor
- `4508bdc` — InputBody subscribes to outWire canAccept
- `04e861e` — strip tick/step driver; nodes fire on their own triggers
- `f17a5dd` — retire ChainInhibitor debug button
- `3caf866` — wire seed prop primes inhibitor loop on mount

111/111 vitest green, tsc clean, vocab clean at branch tip.

## What was done this session

**Stage 6 — bug verified** (3caf866):

The AND-gate loop (`readGate → i0 → i1 → readGate.chainIn2`) had no
initial pulse on fresh load, so readGate never fired. Fixed by adding
a `seed` prop to `Wire`: on mount, if `seed !== undefined`, the wire
calls `load(seed)` once. The `i1.out->readGate.chainIn2` edge in
`topology.json` carries `"seed": 1` in its `data` block.

Threading path: `topology.json data.seed` → `spec-to-flow` hoists it
to top-level edge data → `RSubstrateEdgeData.seed` → `Wire seed` prop.
`RWireSpec` and `TopologyRoot` carry it for the test path too.

**Bug confirmed fixed:** log shows `readgate.fire` → `consume(chainIn)`
→ `input.fire` all at the same timestamp. In08 fires the instant
readGate consumes chainIn — independent of the i1→chainIn2 return
pulse (which arrives ~5ms later). Decoupling is verified.

## The model (settled — unchanged)

- **No tick.** No tick counter, no tick concept on driver, nodes, or edges.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger. No driver poll, no round walk.
- **Running ≠ emitting.** `run()` is a handler that may or may not
  pulse out depending on local preconditions.
- **`useDriver`** is a halt-control, not a coordinator. Rename to
  `useHaltControl` noted, not done.

## Carried items (still open)

- R4: substrate-up-the-stack import in `RSubstrateEdge.tsx`
  (`dashForKind`, `markerEndUrl` from `../rf/`).
- R5 (watch-only): `app.tsx` coupling.
- `useDriver` rename to `useHaltControl` — noted, not done.
- `task/in0-readgate-emission-ack` — parked, awaiting deletion sign-off.

## Next move

Branch is complete. Candidates for next session:

- Merge `task/substrate-slot-in-node` → `main`, then
  `task/self-scheduling-nodes` → `main` (needs explicit sign-off).
- Delete `task/in0-readgate-emission-ack` (needs sign-off).
- Carry items above (R4 import cleanup, `useHaltControl` rename).

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** No center exists.
- **canAccept IS the trigger.** Wire-empty + dest-slot-empty invokes
  `run()`. No scheduler, no walker, no clock.
- **Running ≠ emitting.** Sources can run and decline to pulse.
- **Concept-bounded code, not layer-bounded.**

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user to
  name the next frame.
- When designing fixes, first ask: what does the Go side do?
- Use Claude Code as a fabricator, not a co-designer.

See `memory/feedback_substrate_vs_coordinator_bias.md` and
`memory/feedback_visual_first_default.md`.

## Open branches

- `main` — production trunk.
- `task/substrate-slot-in-node` — eligible for merge to main.
- `task/self-scheduling-nodes` — this branch; eligible for merge
  once `task/substrate-slot-in-node` lands.
- `task/in0-readgate-emission-ack` — parked, deletion needs sign-off.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

After any substrate-r edit, run `npm run build` — vitest/tsc alone
don't refresh `out/webview.js` (stop-hook does, but only when bundled
TS changed and output is older than input).

Cwd for tsc/tests/check:loc/build: `tools/topology-vscode/`.

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
