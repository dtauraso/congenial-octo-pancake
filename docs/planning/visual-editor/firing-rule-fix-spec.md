# Firing-Rule Fix Spec

Branch suggestion: `task/firing-rule-guards`
Commit shape: two commits — (1) MODEL.md contract addition, (2) all
five body fixes bundled (mechanically independent but one invariant).

## Background

Logic audit (2026-05-18) surfaced a value-loss bug class in
`substrate-r/node-kinds.tsx`. `RelayBody`, `RegisterBody`,
`InhibitRightGateBody`, `JoinBody`, and `ChainInhibitorBody`
(inhibitWire branch) call `node.consume(slotId)` without first checking
`slotPhase === "filled"` and/or `outWire.canAccept`. When the
destination wire is in-flight, `wire.load` silently no-ops and the
consumed value is dropped. `ReadGateBody` (lines ~299–309) is the only
body that guards correctly.

MODEL.md states "firing is precondition-gated" but does not explicitly
mandate the slot-phase + canAccept guards before each `consume`. So
this is a missing-contract issue as much as a per-body bug.

## 1. Contract statement (MODEL.md addition)

Append to the "Firing rule and slot writes" section, after the
paragraph ending "...RAF pacing is the observation window, not an
independent clock competing for authority":

> **Output-readiness precondition.** Before consuming any slot, a node
> body must verify two conditions locally: (a) every input slot it
> intends to consume is in `filled` phase, and (b) every destination
> wire it intends to load reports `canAccept === true`. Both checks
> are read-only observations of local state — no signal crosses to
> another node. If either condition is unmet, the body returns
> without consuming anything and re-observes on the next poll frame.
> A body that consumes a slot before verifying `canAccept` loses the
> value silently when the wire no-ops the load; this is a contract
> violation, not a retry. The precondition is all-or-nothing: partial
> consumption is not permitted.

No banned vocabulary introduced. `canAccept` is a pure read of local
wire and dest-slot phase; the check stays local to the observing body.

## 2. Mechanism: open-code, do NOT add a `tryFire` helper

Each body keeps its own inline guards, following `ReadGateBody` as the
reference. Rationale: a `tryFire(reads, writes, action)` helper would
need to accept the set of input slots and output wires as arguments
and call `action` only when both preconditions hold. That signature
*is* a firing rule — it would become a policy engine that has to
encode per-body distinctions (ReadGate passes `slots[0]` through; Join
concatenates both; ChainInhibitor swaps a held ref). Encoding those
into a shared helper turns it into a coordinator-shaped abstraction in
a medium wrapper. MODEL.md says "a node's identity *is* its firing
rule" — keep the rule on the body.

The only shared surface needed is the already-existing `wire.canAccept`
getter and `node.slotPhase()`. No new primitive.

## 3. Per-body edits (file: `substrate-r/node-kinds.tsx`)

### RelayBody (lines ~141–147)

Replace the `run` body with:

```ts
if (node.slotPhase(slotId) !== "filled") return;
if (!wire.canAccept) return;
const value = node.consume(slotId);
wire.load(value);
```

### RegisterBody (lines ~258–267)

```ts
if (node.slotPhase(slotId) !== "filled") return;
if (!wire.canAccept) return;
const incoming = node.consume(slotId);
const emitted = heldRef.current;
heldRef.current = incoming;
wire.load(emitted);
```

The held-swap must happen only when both preconditions pass —
otherwise consume-without-load corrupts `heldRef`.

### InhibitRightGateBody (lines ~31–52)

Only the firing branch (leftFilled && !rightFilled) needs the
`canAccept` guard; the inhibit-consume branch produces no output.

```ts
const leftFilled  = node.slotPhase(leftSlotId)  === "filled";
const rightFilled = node.slotPhase(rightSlotId) === "filled";
if (!leftFilled && !rightFilled) return;
if (leftFilled && !rightFilled && !wire.canAccept) return;
const leftValue = node.consume(leftSlotId);
node.consume(rightSlotId);
if (leftFilled && !rightFilled) wire.load(leftValue);
```

### JoinBody (lines ~168–175)

```ts
if (node.slotPhase(slotAId) !== "filled") return;
if (node.slotPhase(slotBId) !== "filled") return;
if (!wire.canAccept) return;
const va = node.consume(slotAId);
const vb = node.consume(slotBId);
wire.load([va, vb]);
```

### ChainInhibitorBody (lines ~217–224) — both out wires

Currently checks slot phase but neither `outWire.canAccept` nor
`inhibitWire.canAccept`. Both need guards:

```ts
const inhibitWire = inhibitOutWireRef?.current ?? null;
if (node.slotPhase(slotId) !== "filled") return;
if (!wire.canAccept) return;
if (inhibitWire && !inhibitWire.canAccept) return;
const incoming = node.consume(slotId);
const emitted = heldRef.current;
heldRef.current = incoming;
setHeldDisplay(incoming);
if (traceId) postLog("trace.chaininhibitor.fire", { node: traceId, incoming, emitted });
wire.load(emitted);
if (inhibitWire) inhibitWire.load(emitted);
```

## 4. `Node.fill` mis-wiring: keep silent no-op

`Node.fill` (`Node.tsx:64`) silently returns when `s.phase !== "empty"`.
This is correct: it is the deferred-deliver safety path (`Wire.tsx`
`deliverIfPending` retries `fill` across RAF frames until the slot
empties). Throwing here would break the deferred path.

The "mis-wiring caught at parseSpec" guarantee belongs at the spec
boundary (two wires assigned the same `(node, slotId)` pair), not at
`fill` time. No change to `Node.fill`.

Optional diagnostic: add `if (traceId) postLog("trace.fill.deferred", …)`
inside the early-return so the .probe log surfaces repeated deferrals
as a signal, not an error.

## 5. Verification

- `npm run build` in `tools/topology-vscode/` — tsc clean and
  `out/webview.js` refreshed.
- `node tools/topology-vscode/scripts/check-substrate-vocab.mjs` — no
  banned vocabulary introduced.
- Live editor smoke tests against handoff.md's working-features list:
  - **Ring animation:** open ring topology, confirm `trace.chaininhibitor.fire`
    alternates between the two ChainInhibitor nodes in `.probe/webview-log.jsonl`.
  - **ReadGate pass-through:** unchanged (reference impl); spot-check
    a topology that uses it.
  - **Edge seed:** `Wire.tsx` seed logic untouched; confirm `trace.seed`
    appears on mount for seeded wires.
  - **InhibitRightGate inhibit path:** verify a right-slot arrival
    still suppresses output even when out-wire is empty (the new guard
    only blocks the fire branch when canAccept is false).
  - **ChainInhibitor held label:** `setHeldDisplay` still runs after
    guards pass; the `held=N` label continues to update.
- Watch `.probe/webview-log.jsonl` for `trace.load { accepted: false }`
  events that appear *outside* legitimate backpressure windows — that
  would indicate a regression.

## 6. Commit shape

1. `contract(substrate): mandate slot-phase + canAccept guards before consume` —
   MODEL.md addition only.
2. `fix(substrate): guard consume-then-load in Relay/Register/InhibitRight/Join/ChainInhibitor` —
   all five body edits in one commit; ReadGateBody unchanged.

Then update handoff.md and merge `task/firing-rule-guards` into main.
