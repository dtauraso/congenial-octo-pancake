# Kind Audit & Consolidation

**Branch:** `task/kind-audit-consolidation`
**Status:** open

## Goal

Shrink the substrate kind set. Every kind costs: a Go body, a SPEC.md,
a `main.go` blank import, an entry in the generated `node-defs.ts`, and
mental load when reasoning about wiring. Some current kinds are likely
dead, redundant, or merge-able. Cutting them compounds across every
future infra refactor.

This is a prerequisite to further infra cuts (struct-tag populates, Go
AST → ports, etc.); doing infra on dead kinds is wasted work.

## Method

Per-kind, gather:

- **Ports** (from `nodes/<Kind>/<Kind>.go` channel fields).
- **One-line firing rule** (from `SPEC.md` pseudocode).
- **Used in `topology.json`?** Count of instances.
- **Used in any other reference topology** under `docs/`, `examples/`,
  fixtures? List paths.
- **Overlap candidates**: kinds with same port shape OR same firing
  rule modulo a flag.

Then for each kind decide:

- **keep** — distinct firing rule, in use.
- **merge into X** — same shape as X with a flag; collapse.
- **delete** — unused and no plan to use.
- **defer** — has a future use; keep for now, revisit.

## Suspects (a priori)

Worth scrutinizing before the audit table is filled:

- **Relay, Join** — editor-only, no Go body. Relay is 1-in-1-out
  passthrough (equivalent to a wire). Join might be subsumed by any
  two-input kind.
- **Inhibitor, ChainInhibitor, EdgeInhibitor, TransferInhibitor** —
  four inhibitor variants. Probably two distinct shapes behind four
  names.
- **StreakDetector vs StreakBreakDetector** — symmetric pair; could
  collapse to one with an inversion flag.
- **ReadGate, ReadLatch, SyncGate** — three two-input-one-output gates
  differing only in timing/buffering. May collapse.

## Audit table

| Kind | Ports (in → out) | Firing rule (one line) | Usages | Overlap | Decision |
|------|------------------|------------------------|--------|---------|----------|
| Input | 0 → 1 (ToNext) | Poll init queue; forward once; clear on send. | topology: 2; docs: 1 | — | ✅ **keep** — source node. |
| ReadGate | 2 → 1 (value+inhibitor / gated) | Buffer both; emit value when both arrive. | topology: 1; docs: 1 | SyncGate, Join | ✅ **keep**. |
| ChainInhibitor | 1 → 4 (prev / next+edge+new+ack) | Block on prev; emit old to ToEdge/ToNext, new to ToEdgeNew, 1 to ToReadGate. | topology: 2; docs: 2 | Inhibitor | ✅ **keep** — superset; fan-out + ack. |
| InhibitRightGate | 2 → 1 (left+right / passed) | Emit 1 if left==1 AND right==0. | topology: 1; docs: 1 | AndGate | ✅ **keep**. |

## Findings (haiku sweep, 2026-05-19)

**Tally:** keep 4, delete 12, defer 0 (16 total).

- ✅ **Keep:** Input, ReadGate, ChainInhibitor, InhibitRightGate.
- 🗑️ **Deleted:** Relay, Join, Inhibitor, EdgeInhibitor, TransferInhibitor, StreakDetector, StreakBreakDetector, ReadLatch, SyncGate, AndGate, EdgeNode, Partition.

## Results

- 🗑️ **Relay** — deleted 2026-05-19 on `task/kind-audit-consolidation`. SPEC.md removed; dropped from `RUNTIME_IMPLEMENTED_KINDS` and `NODE_TYPES`; `node-defs.ts` regenerated.
- 🗑️ **Join** — deleted 2026-05-19 on `task/kind-audit-consolidation`. SPEC.md removed; dropped from `RUNTIME_IMPLEMENTED_KINDS`; `node-defs.ts` regenerated.
- 🗑️ **Inhibitor** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; dropped from `RUNTIME_IMPLEMENTED_KINDS`; `node-defs.ts` regenerated.
- 🗑️ **EdgeInhibitor** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated.
- 🗑️ **TransferInhibitor** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated.
- 🗑️ **StreakDetector** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated.
- 🗑️ **StreakBreakDetector** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated; fixture parity test removed.
- 🗑️ **ReadLatch** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; `node-defs.ts` regenerated; fixture parity tests removed (FixtureParity_ReadLatch_test.go and FixtureParity_test.go which wired ReadLatch as integration harness).
- 🗑️ **SyncGate** — deleted 2026-05-20 on `task/kind-audit-consolidation`. Go body + SPEC removed; main.go blank import removed; dropped from `node-types.ts`; `node-defs.ts` regenerated; fixture parity test removed.

## Kind structure

### Input

#### Go

```go
type InputNode struct {
	Id     int
	Name   string
	Init   []int
	ToNext chan<- int
}
```

Update body uses a local index:

```go
for i := 0; i < len(n.Init); {
    select {
    case n.ToNext <- n.Init[i]:
        i++
    }
}
```

- **Inputs:** none — source node; no inbound channel
- **Outputs:** `ToNext chan<- int` — forwards each value downstream
- **State:** `Init []int` (seed sequence); no index field — local index iterates Init inside `Update`
- **Firing rule:** local index iterates `Init`; blocking send each `Init[i]` to `ToNext`; goroutine exits when index reaches `len(Init)` (drained)
- **Populate:** `populateInput` copies `data.Init` directly into the `Init` slice; no chan allocation

#### RF (node-defs entry)

```ts
input: {
  defaultLabel: "input",
  bg: "#1a1f2e",
  border: "#3fb950",
  text: "#c9d1d9",
  accent: "#3fb950",
  minWidth: 90,
  sources: [
    { id: "ToOut" },
  ],
  displays: ["queue", "repeat"],
},
```

- **Visual:** label `"input"`, accent `#3fb950`, minWidth 90
- **Handles:** targets [], sources [`ToOut`]
- **Displays:** `["queue", "repeat"]`

#### Drift
- RF handle id `ToOut` vs Go field `ToNext` (mismatch still present post-redesign)

---

### ReadGate

#### Go

```go
type ReadGateNode struct {
	Id        int
	Name      string
	Value     int
	HasValue  bool
	HasChainInhibitor bool
	FromInput <-chan int
	FromChainInhibitor   <-chan int
	ToChainInhibitor   chan<- int
}
```

- **Inputs:** `FromInput <-chan int` — value to gate, `FromChainInhibitor <-chan int` — chain-inhibitor signal
- **Outputs:** `ToChainInhibitor chan<- int` — passes value through when both inputs arrive
- **State:** `Value int`, `HasValue bool`, `HasChainInhibitor bool`
- **Firing rule:** non-blocking poll each input independently; when both `HasValue && HasChainInhibitor`, send `Value` to `ToChainInhibitor` and clear both
- **Populate:** none

#### RF (node-defs entry)

```ts
readGate: {
  defaultLabel: "readgate",
  bg: "#f3e5f5",
  border: "#7b1fa2",
  text: "#4a148c",
  accent: "#7b1fa2",
  minWidth: 70,
  sublabel: "val / inhibitor",
  targets: [
    { id: "FromInput" },
    { id: "FromChainInhibitor" },
  ],
  sources: [
    { id: "ToChainInhibitor" },
  ],
},
```

- **Visual:** label `"readgate"`, accent `#7b1fa2`, minWidth 70, sublabel `"val / inhibitor"`
- **Handles:** targets [`FromInput`, `FromChainInhibitor`], sources [`ToChainInhibitor`]
- **Displays:** none

#### Drift
- none — handle ids `FromInput`, `FromChainInhibitor`, `ToChainInhibitor` match Go fields exactly

---

### ChainInhibitor

#### Go

```go
type ChainInhibitorNode struct {
	Id         int
	Name       string
	HeldValue  int
	FromPrev   <-chan int
	ToNext     chan<- int
	ToReadGate      chan<- int
	ToEdge     []chan<- int
	ToEdgeNew  []chan<- int
}
```

- **Inputs:** `FromPrev <-chan int` — incoming value to hold
- **Outputs:** `ToNext chan<- int`, `ToReadGate chan<- int`, `ToEdge []chan<- int` — old value fan-out, `ToEdgeNew []chan<- int` — new value fan-out
- **State:** `HeldValue int`
- **Firing rule:** blocking receive on `FromPrev`; emit old `HeldValue` to all `ToEdge` and `ToNext`, new value to all `ToEdgeNew`, ack 1 to `ToReadGate`, then update `HeldValue`
- **Populate:** `populateChainInhibitor` seeds `HeldValue` from `data.InitialSlots["held"]`; ensures `ToEdge` has at least one channel

#### RF (node-defs entry)

```ts
chainInhibitor: {
  defaultLabel: "chainInhibitor",
  bg: "#fff3e0",
  border: "#e65100",
  text: "#bf360c",
  accent: "#e65100",
  minWidth: 90,
  targets: [
    { id: "FromPrev" },
  ],
  sources: [
    { id: "ToNext" },
    { id: "ToReadGate" },
    { id: "ToEdge" },
    { id: "ToEdgeNew" },
  ],
  displays: ["held"],
},
```

- **Visual:** label `"chainInhibitor"`, accent `#e65100`, minWidth 90
- **Handles:** targets [`FromPrev`], sources [`ToNext`, `ToReadGate`, `ToEdge`, `ToEdgeNew`]
- **Displays:** `["held"]`

#### Drift
- none — handle ids match Go fields; `ToEdge`/`ToEdgeNew` are slice fields in Go; RF represents them as single source handles (fan-out is implicit)

---

### InhibitRightGate

#### Go

```go
type InhibitRightGateNode struct {
	Id       int
	Name     string
	Left     int
	HasLeft  bool
	Right    int
	HasRight bool
	FromLeft  <-chan int
	FromRight <-chan int
	ToPassed  chan<- int
}
```

- **Inputs:** `FromLeft <-chan int` — pass signal, `FromRight <-chan int` — inhibit signal
- **Outputs:** `ToPassed chan<- int` — emits 1 when left passes and right is absent
- **State:** `Left int`, `HasLeft bool`, `Right int`, `HasRight bool`
- **Firing rule:** non-blocking poll each input independently; when both `HasLeft && HasRight`, compute `result = 1` iff `Left==1 && Right==0`, send to `ToPassed`, clear both
- **Populate:** none

#### RF (node-defs entry)

```ts
inhibitRightGate: {
  defaultLabel: "inhibitRightGate",
  bg: "#fce4ec",
  border: "#880e4f",
  text: "#880e4f",
  accent: "#880e4f",
  minWidth: 110,
  sublabel: "L pass / R inhibit",
  targets: [
    { id: "FromLeft" },
    { id: "FromRight", accent: "#f48fb1" },
  ],
  sources: [
    { id: "ToPassed" },
  ],
},
```

- **Visual:** label `"inhibitRightGate"`, accent `#880e4f`, minWidth 110, sublabel `"L pass / R inhibit"`
- **Handles:** targets [`FromLeft`, `FromRight` (accent `#f48fb1`)], sources [`ToPassed`]
- **Displays:** none

#### Drift
- none — handle ids `FromLeft`, `FromRight`, `ToPassed` match Go fields exactly

## Follow-ups

- **Line.go hand-wiring** (deferred): `Line.go` still constructs its topology with struct literals and manual chan allocation (e.g. `InputNode{Init: []int{0, 1, 0}, ...}`). Long-term this should move into a JSON file loaded via `Wiring.LoadTopology`, so there is one construction path instead of two.

## Migration plan template

For each `delete` or `merge`:

- **Topology.json migration** — script or hand-edit to remove/rename
  affected instances. Must run before the Go body is removed or the
  loader will throw `unknown node kind`.
- **SPEC.md disposition** — for merged kinds, the absorbing kind's
  SPEC absorbs the flag; the dissolved SPEC is deleted.
- **Editor migration** — `node-defs.ts` regenerates automatically;
  no manual TS edit unless a kind is added.

## Out of scope

- Adding new kinds. This pass only subtracts.
- Renaming kept kinds.
- Refactoring firing rules. If a rule is genuinely subtle and worth
  keeping, leave it alone.

## Constraints

- Do not break the currently-running `topology.json`. Either migrate
  it in the same commit as the kind change, or land the kind change
  behind a flag.
- Generated artifacts (`node-defs.ts`) re-emit from SPEC.md changes;
  don't hand-edit.
- One kind decision per commit so each is independently revertable.
