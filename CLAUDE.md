# CLAUDE.md

## What this project is

A neural-inspired concurrent dataflow system implemented in Go. The topology IS the logic — behavior emerges from wiring, not procedural code. Goroutines and channels replace conventional control flow.

Inspired by formalized neuroscience: lateral inhibition, contrast detection, and competitive binding are implemented as circuit primitives.

The long-term goal is constant-time equality, multiplication, and set membership using the same topology — the foundation for level 1 AGI with small integers.

## Core concepts

**Inhibitor chain** — data cascades forward through ChainInhibitorNodes. Each inhibitor can suppress neighboring timelines via lateral inhibition, so only the strongest matching timeline claims input.

**Edge nodes (XOR)** — detect contrast between adjacent inhibitors. Fire when input aligns with a partition's timing window.

**Partition nodes** — define timing windows. When contrast is detected, the winning partition suppresses other timelines.

**AND gate tree** — reduces per-inhibitor signals up the hierarchy. AND gates serve three roles:
1. Reduction within a partition (all inhibitors matched → one signal up)
2. Cross-timeline equality detection (two hierarchies traversed same distance → AND fires)
3. Set membership (small timing delay variant)

**Lateral inhibition** — ensures only one timeline claims each input. Neighbors get suppressed so binding works cleanly.

## Latch + AND gate backpressure pattern

Prevents channel overwrite in the pipeline. Each pipeline segment:

```
source → readLatch → inhibitor → detectorLatch → inhibitor → ...
```

Each latch holds one value and releases only when its controlling AND gate fires. The AND gate waits for:
1. Detectors (sbd, sd) finished processing the current value
2. Downstream latch ack (next pipeline slot is free)

**Concrete wiring:**
- `readGate = AND(in0Ready, detectorLatchAck)` → releases `readLatch`
- `syncGate = AND(sbd0Done, sd0Done)` → releases `detectorLatch`
- Each `detectorLatch` acks the gate controlling the previous latch

See `docs/latch-backpressure.md` for the full cycle description.

## Two modes, same machinery

- **Self-sustaining mode:** Partitions cycle through hierarchical data continuously. This is the particle at rest — already running, already bound.
- **Disruption mode:** External input perturbs the running system, causing data cascades, XOR contrast changes, and lateral inhibition conflicts.

Build order: get the disruption/response machinery solid first, then add the self-cycling layer on top.

## Node types

| Directory | Role |
|-----------|------|
| `InputNode/` | Feeds values into the chain |
| `ReadLatchNode/` | Holds input until readGate fires |
| `ChainInhibitorNode/` | Cascades data, suppresses neighbors |
| `LatchNode/` / `SyncLatchNode/` | General latches |
| `EdgeNode/` | XOR contrast detector between adjacent inhibitors |
| `StreakDetector/` | Detects same-sign runs (-1,-1 or 1,1) |
| `StreakBreakDetector/` | Detects sign changes (1,-1 or -1,1) |
| `AndGateNode/` | Logical AND over multiple input signals |
| `SyncGateNode/` | AND gate controlling latch release |
| `ReadGateNode/` | AND gate controlling readLatch release |
| `PartitionNode/` | Defines a timing window |
| `DistributeNode/` | Branches/spawns timelines |
| `TransferInhibitorNode/` | Moves partition endpoint refs along chain |
| `InhibitorNode/` | Base inhibitor |
| `CascadeAndGateNode/` | Legacy — replaced by latch+gate+ack pattern |

## Diagrams

`diagrams/topology-chain-cascade.svg` — current reference diagram showing the latch + AND gate backpressure topology for a two-inhibitor chain. All lines are orthogonal (snake-routed).

## SVG output

If the task involves generating or modifying any SVG, read
[docs/svg-style-guide.md](docs/svg-style-guide.md) before writing.
It contains the binding conventions (semantic grouping, class-based
styling, metadata block, renderer exceptions) and the house-style
vocabulary. Do not write SVGs without reading it first. If the task
does not touch SVGs, skip it.

## Memory

Project memory lives in `memory/` at the repo root. Files:
- `memory/project_architecture.md` — system design and big-picture goals
- `memory/project_backpressure_pattern.md` — latch + AND gate backpressure wiring
- `memory/project_sustained_activity.md` — self-cycling particle design direction
- `memory/user_background.md` — user context and working style
- `memory/feedback_open_files.md` — tooling preferences

## Workflow

- **All changes require explicit user sign-off before committing or pushing — no exceptions, regardless of file type (code, SVG, docs, memory, config).** After any change, build/run/verify and then stop and wait. Only commit when the user explicitly asks ("commit and push", "ship it", "lgtm", etc.). A sign-off authorizes the specific change just discussed, not future changes.
- One logical change per commit
- Build and run before reporting a change as ready; verify output matches previous run
- Push each commit to the current feature branch (only after the sign-off authorizing it)
- Channel names encode which two nodes are connected — preserve this convention

## Language / runtime

Go 1.21.4 — `github.com/dtauraso/congenial-octo-pancake`
