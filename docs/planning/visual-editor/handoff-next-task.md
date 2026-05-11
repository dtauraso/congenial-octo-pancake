# Next task — wire phase state (in flight)

**Branch:** `task/wire-phase-state`
**Status:** code + tests green; not yet merged.

## What landed
Substrate wire phase widened from `empty | carrying(v)` to
`empty | loaded(v) | taken(v)` so the renderer can distinguish
"traveling" from "arrived but not yet acked". Phase matches the wire
loop's own await points; still timing-free per [MODEL.md](../../../MODEL.md).

Files touched:
  - [MODEL.md](../../../MODEL.md) — phase amendment + allowed-vocab
    update; `carrying` retired entirely.
  - [wire-entity.ts](../../../tools/topology-vscode/src/substrate/wire-entity.ts)
    — three-phase `WireState`; `take()` now sets `taken(v)` before
    emitting; `ack()` requires `taken`.
  - [wire-loop.ts](../../../tools/topology-vscode/src/substrate/wire-loop.ts)
    — acks when `state.kind === "taken"`.
  - [host-shim.ts](../../../tools/topology-vscode/src/host-shim/host-shim.ts)
    — emits a frame on each of loaded/taken/acked (taken is no longer
    invisible).
  - [messages.ts](../../../tools/topology-vscode/src/messages.ts) —
    `WireFrameMsgState` widened.
  - [AnimatedEdge.tsx](../../../tools/topology-vscode/src/webview/rf/AnimatedEdge.tsx)
    — reads `phase`; `loaded` and `taken` both render the value badge.
  - [check-substrate-vocab.mjs](../../../tools/topology-vscode/scripts/check-substrate-vocab.mjs)
    — `\bcarrying\b` is now banned.
  - Tests: wire-entity-contract, wire-loop, node-loop-uniform-v2,
    host-shim, run-frames, serialize-frame.

## Gates
  - tsc ✓
  - build ✓
  - vitest 38 / 193 ✓
  - vocab gate ✓

## Why this is a prerequisite
Unblocks `task/edge-pulse-motion`. With three phases, the renderer's
pulse animation triggers on `empty → loaded` (start travel) and ends
on `loaded → taken` (arrived). The post-arrival hold is just the
`taken` phase — no synthesis needed. Risks 1 / 4 / 5 in the
pulse-motion plan dissolve once this lands.

## Decisions encoded (David, this session)
  1. Retire `carrying` entirely — gate enforces it.
  2. Keep `v` in `taken(v)` so renderer can still show value during hold.
  3. Single commit: MODEL.md + substrate + frame plumbing + renderer +
     tests land together so the type system is never red between commits.

## Next move
  1. Sign-off review — MODEL.md edit + merge to `main`.
  2. Start `task/edge-pulse-motion`: pulse-clock module +
     per-edge rAF hook driven by phase transitions.

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
