# Handoff

Live continuation prompt. Schema lives in
[continuation-prompt-template.md](continuation-prompt-template.md);
this file is the filled-in current state. A fresh AI session should
read this file first (no chat history needed) and proceed.

This handoff is split across sibling files (LOC budget, ≤100 each).
Read them in this order on a fresh session:

  1. [handoff-next-task.md](handoff-next-task.md) — load-bearing
     next task: cut the editor over to the new React-resident substrate.
  2. [handoff-substrate-iteration.md](handoff-substrate-iteration.md)
     — earlier decided substrate model (forever-loops). Superseded for
     the visual editor by the React-component substrate; kept as the
     model that the new primitives realize.
  3. [handoff-frame.md](handoff-frame.md) — conceptual frame, working
     mode, open branches, housekeeping.

---

State at handoff (2026-05-10, end of session):

  **Active task branch:** `task/collapse-to-one-layer`. Latest commit
  `2cb806b`. Not yet merged. Posture is structural rewrite, not
  friction-driven — David approved the substrate-rule override AND
  the editor-may-break-mid-rewrite premise to push through the
  cutover. Editor's webview now runs on the new substrate; the live
  Input → wire → ReadGate cycle works end-to-end with a clickable ⌫
  button. Edge visual fidelity and old-code deletions remain. See
  [handoff-next-task.md](handoff-next-task.md).

  **Two specs landed**, both on main:
  - [manual-take-model.md](manual-take-model.md) — destination-policy
    model; take is the single permitted observer→substrate signal.
    Auto destinations emit take on animation completion; manual-take
    destinations emit it on user click. Same substrate event.
  - [react-surface-spec.md](react-surface-spec.md) — substrate
    primitives as React components: `<Wire>` owns phase, `<Node>`
    owns run and manual-take, `useTickDriver` walks rounds and
    observes wire cycle completion. Plus behavioral traces for the
    pulse animation cycle and geometry-change-while-loaded.

  **New primitives + registry + RF integration landed** on this
  branch. Cutover commit at `09ada85`; deletions at `87822c1`;
  manual-take button + registry fix at `2cb806b`.
  Editor wiring now flows through the new substrate:
  - `webview/substrate-r/wire-phase.ts` — pure reducer.
  - `webview/substrate-r/Wire.tsx` — `<Wire>` with sync-observable
    phase apply + RAF animation effect.
  - `webview/substrate-r/Node.tsx` — render-less imperative `<Node>`;
    exposes run() and requestTake().
  - `webview/substrate-r/ManualTakeButton.tsx` — HTML ⌫ button,
    subscribes to wire phase, arms when loaded.
  - `webview/substrate-r/useTickDriver.ts` — driver with event-driven
    round close + halt/resume/step.
  - `webview/substrate-r/TopologyRoot.tsx` — spec-driven orchestrator.
  - `webview/substrate-r/spec.ts` — RTopologySpec shape.
  - `webview/substrate-r/node-kinds.tsx` — Input and ReadGate kinds.

  **Gates:** tsc ✓, build ✓, vitest 233/233 ✓, vocab ✓, LOC ✓.

  **Audit blocker fix on this branch:** substrate/log.ts no longer
  uses `require`; reads `__vscodeApi` off `window`. Substrate is
  webview-portable.

## Dev-loop

Edit → `npm run build` → topology tab refreshes in place.

## Next move

  Read [handoff-next-task.md](handoff-next-task.md). The cutover step
  is where this branch becomes user-visible.

ALWAYS — at end of session, overwrite this file (and the sibling
`handoff-*.md` files) with a freshly-rendered prompt tailored to the
state you're leaving the branch in, and commit on the active branch
(main if no task is in flight). Do not rely on chat history; the
next AI may be a fresh model with no transcript. The rendered
handoff must itself contain this same ALWAYS clause so the loop is
self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md)
as the structural source of truth; update the template when an
invariant changes. Keep each file ≤100 LOC per the budget rule.
