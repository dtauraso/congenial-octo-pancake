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

**Active branch:** `task/pulse-secondary-value` — all 5 plan commits landed.

Branch is **not yet merged to main**. Do not merge without explicit sign-off.

## What landed (task/pulse-secondary-value)

- `spec.ts`: added `"register"` to `RNodeKind`, `value?: unknown` to
  `RWireSpec`, and `register: { inputs: ["in0"], outputs: ["out"] }` to
  `NODE_KIND_PORTS`.
- `Wire.tsx`: added `value?: unknown` prop; seed mount effect emits
  structured `{primary: seed, secondary: value}` when both present;
  `formatRidingLabel` helper (`p:s` format for structured values);
  `data-testid` on riding-label text element.
- `TopologyRoot.tsx` + `RSubstrateEdge.tsx`: wire `value` prop threaded
  through both test path and editor path (same commit — landing rule).
- `spec-to-flow.ts`: `value` field round-tripped in edge data.
- `node-kinds.tsx`: `ReadGateBody` emits `{primary:1, secondary}` where
  `secondary = slots.length >= 2 ? 1 : 0`; `RegisterBody` (new) is a
  one-round delay buffer — emits held secondary on fire, stores incoming.
- `inhibit-right-gate.tsx`: relay-style transparent forwarding of `leftValue`.
- `e2e/riding-label.spec.ts` + `e2e/fixtures/riding-label.json`: updated
  for RAF (not WAAPI) delivery; fixture has real input queue; assertion
  expects `"7"`.
- `test/contracts/r-topology-readgate-register.test.tsx` (new): two
  contract tests — Register round-1 emits null; ReadGate→Register chain
  end-to-end.

All 127 tests green; build clean; tsc --noEmit clean.

## Open items

- No Playwright e2e for ReadGate→Register chain (plan step 5 mentioned
  one; skipped because contract tests cover the semantics and the e2e
  harness needs a running extension host). Revisit if a concrete need arises.
- `task/pulse-secondary-value` awaits merge sign-off from David.

## The model (settled)

- **No tick.** No tick counter, no tick concept.
- **No step.** Driver surface is `halt` / `resume` + `pauseAxis`.
- **Node runs the moment canAccept fires.** Wire-empty + dest-slot-empty
  is the trigger — this is the named control-flow event.
- **Running ≠ emitting.** `run()` is a handler; pulsing out depends
  on local preconditions.
- **Secondary value** is the data channel on a pulse; primary is the
  control-flow event signal. ReadGate encodes slot-count in secondary
  (0 for 1-slot, 1 for 2+). Register is a one-round shift-register.

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
