# Firing-Rule Unit Tests Spec

## Problem

The current Go test suite (`Trace/FixtureParity_*.go`, `Trace/Trace_test.go`,
`Trace/Parity_test.go`) is built on whole-topology trace snapshots compared
against JSONL golden files in
`tools/topology-vscode/test/fixtures/*.trace.jsonl`.

Audit findings from `git log -- Trace/`:

- **6 test files, ~1100 LOC**; zero fix commits referencing a real product
  bug. Every substantive commit is a re-baseline: `rename(readgate)`,
  `refactor(ChainInhibitor)`, `refactor(InputNode)`, etc.
- The one "fix" commit (`7a4c19d`) is a test-alignment fix, not a product bug.
- Port names are embedded as strings; every rename cascades through goldens
  and helper maps — ~30–50 LOC of churn with no safety payoff.
- 12 JSONL fixtures remain from deleted kinds (dead weight).

**Verdict:** the suite is net-negative. It taxes renames without catching
firing-rule bugs.

## Proposed shape

Per-kind firing-rule unit tests. No topology wiring, no goroutines, no
fixture files.

Each test:
1. Constructs a node struct directly.
2. Writes values into the node's input channel fields by name
   (`node.Value <- 42`, `node.Ack <- true`).
3. Calls the node's tick function (or runs one goroutine iteration with a
   short timeout).
4. Asserts emissions on the output channel fields by name
   (`<-node.Gated == 42`).

Go field names are used directly, so a port rename is a compile error in the
test, not a golden-file diff. No helper maps, no JSON marshalling.

Target: one test file per kind (`nodes/<Kind>/firing_rule_test.go`), ≤ 60 LOC each, zero fixture files. Go field names are used directly, so a port rename is a compile error, not a golden diff.

## What to delete

All six test files are candidates for deletion; none have a real-bug catch on
record:

- `Trace/FixtureParity_ChainInhibitor_test.go`
- `Trace/FixtureParity_InhibitRightGate_test.go`
- `Trace/FixtureParity_InputNode_test.go`
- `Trace/FixtureParity_ReadGate_test.go`
- `Trace/Parity_test.go`
- `Trace/Trace_test.go`

Also delete the dead JSONL fixtures for deleted kinds (AndGate, EdgeNode,
Partition, ReadLatch, SyncGate, StreakDetector, StreakBreakDetector).

## What to keep

None of the existing tests have a verified real-bug catch. Do not port any of
them; start fresh from the firing-rule spec for each surviving kind.

## Migration

One kind at a time. Per commit:
1. Delete `Trace/FixtureParity_<Kind>_test.go`.
2. Add `nodes/<Kind>/firing_rule_test.go` with the per-kind unit test.
3. Run `go test ./...` — must pass.

Start with ReadGate (simplest firing rule: fire when both `Value` and `Ack`
present, emit `Gated = Value`). Then ChainInhibitor, then InhibitRightGate.
Delete `Trace/Trace_test.go` and `Trace/Parity_test.go` in the final cleanup
commit after all per-kind tests are in place.
