# Next task — edge pulse motion (not yet started)

**Branch:** `task/edge-pulse-motion` (to be created from `main`)
**Status:** prerequisite landed; ready to start.

## Prerequisite (landed on main)
`task/wire-phase-state` merged as `c79b9a7`. Substrate wire phase is
now `empty | loaded(v) | taken(v)`; `carrying` retired and banned by
the vocab gate. Host-shim emits a frame on each of loaded / taken /
acked. AnimatedEdge already reads `phase`.

## What this task adds
Renderer-only pulse animation driven by the three-phase transitions:
  - `empty → loaded` starts the pulse (value travels along the edge).
  - `loaded → taken` ends the pulse (arrived; value badge holds).
  - `taken → empty` (ack) clears the hold.

No substrate changes. Lives under
[src/webview/rf/](../../../tools/topology-vscode/src/webview/rf/) and
must never be imported from `src/substrate/` (vocab gate + module
boundary).

## Shape (proposed, confirm before coding)
  - `pulse-clock.ts` — rAF-driven clock module; exposes a per-edge
    hook returning normalized progress `[0, 1]` for the active pulse.
  - `AnimatedEdge.tsx` — consume the hook; render the moving dot /
    value badge along the SVG path using progress.
  - No new message types; phase transitions in existing frames are
    the only input.

## Gates to hit
  - tsc ✓, build ✓, vitest green, vocab gate ✓
  - LOC budget: each new file ≤100 LOC.

## Open question for sign-off
Confirm the pulse-clock is per-edge rAF (one rAF loop subscribed by
edges) vs. a single global rAF that fans out. Default plan: single
global rAF, edges read their own progress — fewer rAF handles.

## Dormant
Shape D port; tick-batching audit superseded; restart-Input friction
(input cycles once and stops — separate task whenever).

## ALWAYS clause
At end of session, overwrite this file (and the sibling `handoff-*.md`
files) with a freshly-rendered prompt tailored to the state you're
leaving the branch in, and commit on the active branch. Do not rely on
chat history; the next AI may be a fresh model with no transcript. The
rendered handoff must itself contain this same ALWAYS clause so the
loop is self-perpetuating across sessions. Use
[continuation-prompt-template.md](continuation-prompt-template.md) as
the structural source of truth; update the template when an invariant
changes. Keep each file ≤100 LOC per the budget rule.
