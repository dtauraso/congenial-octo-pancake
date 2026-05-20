# Remove Populator API — spec

## Motivation

`Wiring.Register(kind, newNode, populate)` takes an optional `Populator`
func that sets non-channel fields on a node after channels are wired.
Only `InputNode` still uses it (`populateInput` copies `data.Init` into
`InputNode.Init`).

Two problems:

1. Every kind that needs to read `data.*` fields must define a populate
   func, register it, and keep the field names in sync. The Populator
   signature `(id, name, *NodeData, any)` defeats type safety — every
   implementation does the same `node.(*MyKind)` assertion + manual copy.
2. The loader already reads `data.initialSlots` declaratively (see
   `feedback-edge-seed-required-for-rings`). `data.init` should land the
   same way: a struct tag on the field tells the loader which `data.*`
   key to copy.

## Target shape

```go
type InputNode struct {
    Init    []int        `wire:"data.init"`
    ToReadGate chan<- int
}
```

Loader reads struct tags during reflection, copies matching `data.*`
JSON values into the tagged fields. No per-kind populate func.

`Wiring.Register` becomes two-arg: `Register(kind, newNode)`. The
`Populator` type and the `populate` field on `kindEntry` are deleted.

## Steps

1. Add `wire:"data.<key>"` tag support to the loader's reflection pass
   (`nodes/Wiring/builders.go` around the existing populate call site).
   Supported value types: `[]int`, `int`, `string`, `bool` to start —
   match what `populateInput` actually copies.
2. Tag `InputNode.Init` with `wire:"data.init"`.
3. Drop `populateInput` and the 3rd arg to `Wiring.Register` in
   `nodes/InputNode/InputNode.go`.
4. Update `Wiring.Register` signature in `nodes/Wiring/registry.go` —
   remove the `populate Populator` param and the `populate` field on
   `kindEntry`. Delete the `Populator` type.
5. Update the populate call site in `nodes/Wiring/builders.go` — replace
   the `if e.populate != nil { e.populate(...) }` block with the
   tag-driven copy.
6. `go build ./...` — fix any other registration call sites flagged.
7. `go run .` — verify `0 1 0` sequence from `topologies/line.json`
   still appears (Input.Init still loads correctly).
8. Update `handoff.md` "Adding a kind" section: drop the populate
   mention; document `wire:"data.<key>"`.

## Verify

- `go test ./...` green.
- `go run .` output includes `readGate: value=0 → 0`, `→ 1`, `→ 0`.

## Out of scope

- Channel field tagging (channels are still wired by name via existing
  port reflection — that's option (d), Go-AST port parsing).
- Validating that `data.*` JSON keys have a corresponding tagged field
  (could be a follow-up; for now, untagged keys are silently ignored).
- Multi-value struct tags (e.g. defaults, required markers).

## Risk

Low. Single consumer (`InputNode`), single struct field, well-typed
JSON value. The loader already does reflection over struct fields for
channel ports; reading a tag during the same pass is a small addition.
