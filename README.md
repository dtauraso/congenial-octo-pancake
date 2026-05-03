# wirefold

A concurrent dataflow system written in Go, paired with a visual editor where the diagram is the source of truth and Go code is generated from it.

## What this is

Two things in one repo:

1. **A dataflow runtime in Go.** Behavior emerges from how nodes are wired together, not from procedural code. Goroutines and channels replace conventional control flow. Primitives include lateral inhibition, contrast detection (XOR edges), partition timing windows, AND-gate reduction trees, and a latch + AND-gate backpressure pattern for safe pipelining.

2. **A visual topology editor** (vscode webview, React Flow) where editing the diagram regenerates the Go source within a second via a deterministic codegen tool (`topogen`). The diagram is the spec; the Go code is the deliverable.

## Repo layout

| Path | What it is |
|------|------------|
| `*Node/` (top-level Go packages) | Runtime primitives: inhibitors, latches, edge/XOR detectors, gates, partitions, distributors |
| `Wiring/` | Topology assembly — how nodes connect at runtime |
| `topogen/` | Spec → Go code generator (`topology.json` → `Wiring/Wiring.go`) |
| `tools/topology-vscode/` | The visual editor (vscode webview, React Flow + Zustand) |
| `topology.json` | The spec (canonical source of truth) |
| `topology.view.json` | Viewer state sidecar (camera, folds, bookmarks — never affects codegen) |
| `diagrams/` | Reference SVGs hand-authored to a house style guide |
| `docs/` | Design docs, planning, style guides |
| `memory/` | Long-running project context for AI-assisted work |

## Status

The dataflow runtime is working. The editor is mid-build — the React Flow rendering substrate, codegen integration, spec/viewer split, saved views, and animated playback timeline are shipped. Phases for richer port-drag editing, fold geometry, trace replay, and visual parity with the reference SVGs are in flight. See [docs/planning/visual-editor-plan.md](docs/planning/visual-editor-plan.md) for the full plan and cap estimates.

## Running it

```bash
go build ./...
go run .
```

The editor lives in [tools/topology-vscode/](tools/topology-vscode/) — see its README for vscode extension build/run instructions.

## License

See [LICENSE](LICENSE).
