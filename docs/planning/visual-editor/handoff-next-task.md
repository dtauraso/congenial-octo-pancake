# Next task: review the substrate model pivot draft

**Branch:** `task/substrate-slot-in-node` (commit `cc9ee2f`).
**Status:** awaiting David's review of the draft. No code yet.

## What to read

1. [MODEL-revised-draft.md](../../../MODEL-revised-draft.md) — the
   proposed pivot. Sections: "Who does what," "React surface
   realization," "What this retires," and the three "Open
   questions" with explained Option A/B and tentative leans.
2. [diagrams/model-revised-draft/README.md](../../../diagrams/model-revised-draft/README.md)
   — index of the seven SVGs that visualize the draft and the
   three open questions.
3. [MODEL.md](../../../MODEL.md) — current authoritative model;
   the draft contradicts it.

## Decisions David needs to make

- **Q1** (tick driver): keep central walker (draft lean) or move to
  self-scheduling nodes?
- **Q2** (slot subscription): per-slot listeners or single
  node-level revision counter (draft lean)?
- **Q3** (visual depiction): slot indicator on the node (draft
  lean) or keep parked-circle-on-wire visual?
- Two ambiguities the diagram agent flagged in `03` and `02` that
  the draft doesn't fully pin: (a) whether `consumed` is a
  transient state that resets immediately, or terminal until the
  next `fill`; (b) whether the source's `dest.slotPhase`
  observation should be visible in topology diagrams or treated as
  out-of-band.

## After approval

Promote draft → MODEL.md, retire/update the
[project_ack_is_wire_state](/Users/David/.claude/projects/-Users-David-Documents-github-wirefold/memory/project_ack_is_wire_state.md)
memory, update CLAUDE.md's "Latch + AND gate backpressure pattern"
section. Only then start code.

## Latent risk worth keeping in mind

Listener reentrancy in
[Wire.tsx:51-56](../../../tools/topology-vscode/src/webview/substrate-r/Wire.tsx#L51-L56)
becomes more dangerous the more node-kinds subscribe under the
current model. The pivot makes this go away (no
`subscribePhase`); until then, treat it as a hazard if writing any
new phase listeners.

## ALWAYS clause

(See handoff.md — same clause applies.)
