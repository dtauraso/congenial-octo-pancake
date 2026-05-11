# Next task — edge pulse motion (not yet started)

**Branch:** `task/edge-pulse-motion` (to be created from `main`)
**Status:** prerequisite landed; ready to start.

## Prerequisite (landed on main)
`task/wire-phase-state` merged as `c79b9a7`. Substrate wire phase is
now `empty | loaded(v) | taken(v)`; `carrying` retired and banned by
the vocab gate. Host-shim emits a frame on each of loaded / taken /
acked. AnimatedEdge already reads `phase`.

## Audit finding — scope is smaller than originally framed
The pulse machinery is already mostly in place. Per-edge rAF already
exists ([PulseInstance.tsx:46-54](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge/PulseInstance.tsx#L46-L54));
arc-length probing, frame tick, and label tracking are working code.
`AnimatedEdge.tsx` already reads the new `phase` field
([AnimatedEdge.tsx:25-26](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx#L25-L26))
but only uses it for stroke/opacity — it does not spawn a
`PulseInstance` on transitions. A legacy event-driven trigger path
(`_use-pulse-lanes-ticked.ts` + `subscribeEdgeArrive`) is unused but
still in the tree.

## What this task does (reduced scope)
1. In `AnimatedEdge.tsx`: on `empty → loaded`, mount a `PulseInstance`
   with the value; on `loaded → taken`, let it finish / unmount; on
   `taken → empty` (ack), the hold-state badge clears.
2. Delete the unused legacy trigger path:
   `_use-pulse-lanes-ticked.ts` and any `subscribeEdgeArrive` plumbing
   it depends on (verify no live callers first).
3. No new `pulse-clock.ts`. No global rAF. The existing per-edge rAF
   in `PulseInstance` stays.

No substrate changes. Renderer-only; module boundary unchanged.

## Gates to hit
  - tsc ✓, build ✓, vitest green, vocab gate ✓
  - LOC budget: nothing currently over 100 LOC in this subtree; keep
    it that way.

## Design note: per-edge rAF, not global (kept)
Per-edge rAF lives on each `PulseInstance`. Path and dot update in the
same component → geometry changes (node drag, re-route) stay seamless
by construction. A previous handoff defaulted to a global rAF on a
"fewer handles" argument; that argument is a micro-optimization
(browsers coalesce rAF callbacks onto the same frame) and it trades
away the seamless-geometry property. Reject the global default unless
a concrete reason to centralize appears.

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
