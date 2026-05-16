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

## State at handoff (2026-05-15)

**Active branch:** `task/pulse-secondary-value` — 8 commits ahead of main.

Branch is **not yet merged to main**. Do not merge without explicit sign-off.

Last action this session: removed `primary` field from pulse payloads
after confirming no code branches on it (always `1`, always forwarded,
never inspected). Pulses now carry a plain scalar.

## What landed (task/pulse-secondary-value)

Commits ahead of main, oldest first:
- `f7d23a2` spec: add value? to RWireSpec and register to RNodeKind
- `f6822ed` wire: data-testid + formatRidingLabel
- `ae7bccd` wire: thread value prop through both test and editor paths
- `09f5633` kinds: ReadGateBody emits secondary 0/1, relay bodies forward
- `79f4a8a` contracts: ReadGate→Register chain tests
- `cec7de0` docs: prior handoff snapshot
- `155f28f` readgate: secondary encodes fill completeness (0=partial, 1=complete)
- `d9c971f` **pulse: remove primary field — pulses carry plain scalar**

Effects of the last commit:
- `ReadGateBody`: `wire.load(1)` on full fire, `wire.load(0)` on partial.
- `RegisterBody`: holds and forwards the scalar directly, no unpacking.
- `Wire.tsx` seed-mount: `load(value ?? seed)` (scalar).
- `formatRidingLabel`: `String(value)` — single number on the wire.
- Contract tests assert scalars (`toBe(0)`, `toBe(1)`, `toBeNull()`).

All 130 tests green; build clean; tsc --noEmit clean; substrate vocab clean.

## Open items

- `task/pulse-secondary-value` awaits merge sign-off from David.
- Working-tree change: `topology.view.json` modified, uncommitted. Pre-existed at session start; not touched.
- No Playwright e2e for ReadGate→Register chain (skipped earlier; contract tests cover semantics).

## The model (settled)

- **No tick.** No tick counter, no tick concept.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger — this is the named control-flow event.
- **Running ≠ emitting.** `run()` is a handler; pulsing out depends
  on local preconditions.
- **Pulse payload is a scalar.** No primary/secondary structure.
  The fact that a pulse exists on a wire is itself the control signal;
  the scalar value is the data. ReadGate emits `1` on full fire, `0` on
  partial fill (no consume). Register is a one-round shift on the scalar.

## Conceptual frame

- **Logic state IS visible state.** No render/logic split.
- **Decentralized, not distributed.** No center exists.
- **canAccept IS the trigger.** No scheduler, no walker, no clock.
- **Running ≠ emitting.** Sources can run and decline to pulse.
- **Concept-bounded code, not layer-bounded.**

## Working mode

- Don't propose niche bundles. User-named frames stand alone.
- Don't offer "next options" menus proactively. Wait for the user to
  name the next frame.
- When designing fixes, first ask: what does the Go side do?
- Delegate executor work to haiku/sonnet subagents; reserve main
  Opus session for judgment.
- Don't pause for sign-off when the user has already said go.
- Verify subagent claims directly when they smell wrong — this session
  caught a haiku Explore agent giving a confidently-wrong diagnosis of
  the riding-label issue.

## Open branches

- `main` — production trunk, active.
- `task/pulse-secondary-value` — complete, awaiting merge sign-off.

Branch hygiene: no merge to main without explicit sign-off. Delete
merged branches without re-asking. Force-push needs sign-off.

## Dev-loop

After any substrate-r edit, run `npm run build` — vitest/tsc alone
don't refresh `out/webview.js`.

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
