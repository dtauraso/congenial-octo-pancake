# Plan: secondary pulse value

## Goal

Pulses currently carry one value — `seed` from `RWireSpec`. The goal is a
**second value** that travels alongside through the full emission → wire →
slot pipeline, observable by both the wire (mid-flight label) and the
destination slot (consumer body).

## Design decisions

### 1. Payload shape — tagged object vs 2-tuple

Two options:

- **Tagged object:** `{ primary: unknown; secondary: unknown }`
- **2-tuple:** `[unknown, unknown]`

**Recommendation: tagged object.** Node bodies that only care about one field
can destructure by name without positional confusion. A tuple forces every
reader to remember "index 0 = primary" — easy to invert, no lint catches it.
The tag makes intent explicit at the call site and in slot fill logs.

### 2. Static `label` vs pulse-carried `value`

`RWireSpec.label` is a static string annotation rendered on the wire path at
all times — it identifies the wire, not the payload. The new `value` field is
distinct: it rides the pulse and is only present while the wire is
`in-flight(v)`. Do not conflate or merge them.

---

## Files and why each matters

### `spec.ts`

Defines `RWireSpec` — the validated shape of a wire as declared in a topology
spec. It is the **anchor point** for any new wire-level field. Adding
`value?: unknown` here makes the field part of the spec contract; downstream
files thread it from this single source of truth. No threading happens in this
step; the field is additive and reversible.

### `Wire.tsx`

The wire primitive. Owns the `Phase` union (`empty | in-flight(v) | empty`),
`wirePhaseReducer`, and `WireHandle.load`. The `in-flight(v)` phase is where
the payload lives during traversal. To carry a secondary value:

- Extend the `in-flight` payload from a scalar to `{ primary, secondary }`.
- Extend `WireProps` with a `value` input (the secondary) so callers can
  supply it at construction time.
- Update the mid-flight riding label — currently `String(value)` renders the
  primary; it will need to render both fields or a chosen representation.

Wire.tsx is in `substrate-r/` (concept-bounded, LOC budget exempt) — edit in
place, do not split.

### `TopologyRoot.tsx`

The **test path**. Renders `<Wire>` directly from a validated `RWireSpec`. It
must thread `spec.value` into the `value` prop on `<Wire>`. If this path is
skipped, tests run with no secondary value even when specs declare one.

### `RSubstrateEdge.tsx`

The **editor path**. Renders `<Wire>` from React Flow edge data
(`RSubstrateEdgeData`). CLAUDE.md's "wire props need both paths" rule applies
here: a new wire prop must be threaded in both `TopologyRoot` and
`RSubstrateEdge` in the same commit, or the editor silently diverges from the
model. `RSubstrateEdgeData` must gain the same `value` field; `RSubstrateEdge`
reads it and passes it to `<Wire>`.

### `spec-to-flow.ts`

Adapter that converts spec edges (`RWireSpec`) to React Flow edges
(`RSubstrateEdgeData`). Currently carries `seed`; must also carry the new
`value` field so the editor path receives it.

### `node-kinds.tsx`

Node body dispatch: `RelayBody`, `JoinBody`, `ChainInhibitorBody`,
`ReadGateBody`, and others. Bodies that load a downstream wire call
`handle.load(payload)`. After this change, `payload` becomes
`{ primary, secondary }`. Relay bodies should forward transparently (pass the
structured payload through unchanged). Bodies that care about the secondary
unpack `.secondary` explicitly. Bodies that only need the primary unpack
`.primary` and ignore the rest.

---

## Threading trace

1. Source body calls `handle.load({ primary, secondary })`.
2. `wirePhaseReducer` stores the structured payload in `Phase.in-flight`.
3. Mid-flight, the riding label renders from the in-flight payload (update
   the existing `String(value)` render).
4. On animation completion, `dest.fill(slotId, { primary, secondary })`
   writes the structured payload into the destination slot.
5. Consumer body calls `node.consume(slotId)`, receives the structured
   payload, and unpacks `.primary` and/or `.secondary` as needed.

---

## Test fixtures at risk

| File | Risk | Notes |
|------|------|-------|
| `e2e/riding-label.spec.ts` | **High** | Asserts `observed!.text === "0"`; will break when the mid-flight label render changes to show a structured payload. Update the assertion when the label rendering changes. |
| `e2e/substrate-2node.json` / `e2e/substrate-step1.spec.ts` | Low | Phase-only assertions; verify they do not inspect label text. |
| `e2e/substrate-pause-resume.spec.ts` | Low | Phase-only; safe. |

---

## Next single concrete step

Add `value?: unknown` to `RWireSpec` in `spec.ts`. No threading. No
downstream changes. Spec anchor only. Reversible if the payload shape
decision changes.

Commit on `main` (no task branch yet — name one when ready to execute).
