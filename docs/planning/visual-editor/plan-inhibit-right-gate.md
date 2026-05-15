# Plan: InhibitRightGate as a Substrate-r Node Kind

## Scope

Add `InhibitRightGate` (`inhibitrightgate`) as a fully-animated substrate-r kind alongside the existing `ChainInhibitor` kind. The schema entry and cascade SVG already specify it; what's missing is the runtime: spec registration, the concept-bounded kind file, the `renderKindBody` case, and the topology fixtures that wire it up. A stray `join1` node from a prior session must also be reverted before the new work lands.

---

## Current State vs. Target State

| What | File | Status |
|---|---|---|
| Schema entry (`InhibitRightGate`, ports `left`/`right` in, `out` out) | `tools/topology-vscode/src/schema/node-types.ts` | ✅ exists |
| Cascade SVG reference (`inhibitRight0`, role `inhibit-right-gate`, `inhibit-in` edges) | `diagrams/topology-chain-cascade.svg` | ✅ exists |
| `RNodeKind` union + `toRNodeKind` + `NODE_KIND_PORTS` | `tools/topology-vscode/src/webview/substrate-r/spec.ts` | ❌ missing |
| `renderKindBody` case for `inhibitrightgate` | `substrate-r/node-kinds.tsx` | ❌ missing |
| Concept-bounded kind implementation | `substrate-r/inhibit-right-gate.tsx` (new) | ❌ missing |
| `inhibitRight0` node + 2 `inhibit-in` wires in live fixture | `topology.json` | ❌ missing |
| Stray `join1` node + 2 edges | `topology.json` + `topology.view.json` | ✅ reverted |

---

## Concrete Change List

### 1. `topology.json` + `topology.view.json` — ✅ done
Stray `join1` node and its two edges removed; `topology.view.json` had no `join1` entry. Clean slate confirmed.

### 2. `spec.ts` — register the new kind
- Extend `RNodeKind` union: `| "inhibitrightgate"`.
- Add `case "inhibitrightgate": return "inhibitrightgate"` in `toRNodeKind`.
- Add `NODE_KIND_PORTS` entry: `inhibitrightgate: { inputs: ["left", "right"], outputs: ["out"] }`.

Rationale: parseSpec validates wire port names against this table at load time; missing entry means any topology using the kind fails immediately.

### 3. `substrate-r/inhibit-right-gate.tsx` — new concept-bounded kind file
Exports `InhibitRightGateBody`. Firing rule: consume `left` (value 1 expected) only when `right` slot is `empty` and out wire `canAccept`. Pattern mirrors `JoinBody` but the precondition is asymmetric — `left` must be `filled`, `right` must be `empty`, out wire must `canAccept`. On fire: consume `left`, load `1` on out wire. `right` slot, if ever filled in the same round (R=1 case), is consumed without emitting.

Rationale: concept-bounded — one file per kind. File size is well under 100 LOC.

### 4. `node-kinds.tsx` — add dispatch case
Add to `renderKindBody` switch:
```ts
case "inhibitrightgate":
  return <InhibitRightGateBody nodeRef={nodeRef} outWireRef={outWireRef}
           leftSlotId={slotIds[0]} rightSlotId={slotIds[1]} traceId={traceId} />;
```
Import from `./inhibit-right-gate`. Rationale: single dispatch point — both `TopologyRoot` and `RSubstrateNode` call this; no second path to forget.

### 5. `ChainInhibitor` kind — `inhibitOut` handle (render-only, confirm)
`node-types.ts` already declares `inhibitOut` as an output port on `ChainInhibitor`. Confirm whether `RSubstrateNode` and `TopologyRoot` thread the `inhibitOut` handle through to the React Flow handle or if a second `outWireRef` must be added to `ChainInhibitorBody`. **No new wire props introduced** — `inhibit-in` edges use the same wire primitive as `chain` edges; the kind is the semantic label, not a new prop. If `ChainInhibitorBody` only holds one `outWireRef`, a second ref for `inhibitOut` must be added. This is the one open question (see Risks).

### 6. `topology.json` — add `inhibitRight0` node + wires
After reverting `join1`: add `InhibitRightGate` node `inhibitRight0`. Add two `inhibit-in` edges: `i0.inhibitOut → inhibitRight0.left` and `i1.inhibitOut → inhibitRight0.right`. Seed the `i1→inhibitRight0` wire with `data.seed: 1` (matching cascade SVG timing: i1 fires first in the cycle, its pulse arrives before i0's).

### 7. `topology.view.json` — add `inhibitRight0` position
Add `"inhibitRight0": { "x": 1200, "y": 215, "sublabel": "INHIBIT(L=1,R=0)" }` (approximate — adjust after visual verification).

---

## Substrate Landing Rule Check

Per CLAUDE.md: node kinds auto-land via `renderKindBody`; the **wire-prop fork** (`TopologyRoot` vs `RSubstrateEdge`) only applies when new wire props are introduced. `inhibit-in` is a semantic edge-class label in the schema, not a React Flow wire prop — no new prop is needed. The fork does not apply here. Landing is auto after adding the `renderKindBody` case.

---

## Semantics

`InhibitRightGate` implements INHIBIT(L=1, R=0). In substrate vocabulary: the gate's `run()` checks (a) `left` slot is `filled`, (b) `right` slot is `empty`, (c) out wire `canAccept`. When all three hold, it consumes `left` and loads `1` on the out wire. Running does not imply emitting — the gate runs every time a slot arrives but only emits when the L=1, R=0 condition holds. The `right` slot, when filled, is consumed silently (no output) so the gate resets for the next round.

See `plan-inhibit-right-gate-firing.svg` for the two-round slot-phase trace.

---

## Test Plan

1. Unit test in `substrate-r/` (vitest): two nodes wiring into an `InhibitRightGate`; assert pulse emitted when only L slot fills; assert no pulse when both fill.
2. Extend existing `TopologyRoot` integration test (or add a new fixture test) with a 3-node spec: `input → inhibitRight0.left`, `input → inhibitRight0.right`, check firing.
3. After implementation: `npx tsc --noEmit` from `tools/topology-vscode/`, then `npx vitest run`, then `npm run build` to verify the live editor.

---

## Risks / Open Questions

1. **`ChainInhibitorBody` second output wire.** ✅ Resolved: `KindBodyCtx.outWireRef` migrated to `outWireRefs: Record<string, RefObject<WireHandle|null>>`, keyed by output port name from `NODE_KIND_PORTS`. The named-map shape scales (per-port names, no positional fragility, symmetric with input slots). Existing single-output bodies read `outWireRefs.out`. Migration committed separately; `ChainInhibitorBody` second handle reads `outWireRefs.inhibitOut` once that port is wired.
2. **Firing when only L fills (right never sent).** If i1 doesn't fire in a round (e.g. the chain is shorter), `right` stays `empty` — the gate fires on L alone. This is correct per INHIBIT semantics but worth confirming with David against the intended circuit behavior.
3. **`topology.json` port name `inhibitOut` vs handle name.** `i0` declares `inhibitOut` as an output in `node-types.ts`; the cascade SVG uses it as the fan-out handle. Confirm that `topology.json` edges use `sourceHandle: "inhibitOut"` (not `"out"`) so `parseSpec` doesn't reject the wire.

---

## Diagrams

- [`plan-inhibit-right-gate-topology.svg`](plan-inhibit-right-gate-topology.svg) — before/after of `topology.json`
- [`plan-inhibit-right-gate-dispatch.svg`](plan-inhibit-right-gate-dispatch.svg) — file-level change map
- [`plan-inhibit-right-gate-firing.svg`](plan-inhibit-right-gate-firing.svg) — slot-phase trace for both firing outcomes
