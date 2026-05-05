# CLAUDE.md

## What this project is

A concurrent dataflow system implemented in Go. The topology IS the logic — behavior emerges from wiring, not procedural code. Goroutines and channels replace conventional control flow.

Lateral inhibition, contrast detection, and competitive binding are implemented as circuit primitives.

The long-term goal is constant-time equality, multiplication, and set membership using the same topology.

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

- **Self-sustaining mode:** Partitions cycle through hierarchical data continuously — already running, already bound.
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

## File size budget

- **Trigger threshold:** any source file ≥ **200 LOC** must be refactored.
- **Refactor target:** split until every resulting file is ≤ **100 LOC**.
- Applies to all hand-written source: `.ts`, `.tsx`, `.go`, etc. Generated files, fixtures, and JSON are exempt.
- The rule is **always active**, including mid-design and mid-debug. If you finish an unrelated change and notice the file is now over 200, refactor in a follow-up commit before moving on.
- Run `npm run check:loc` (in `tools/topology-vscode/`) to list offenders. The script is the source of truth — keep this rule and the script in sync.

## Workflow

- **Commit and push freely on task branches.** Per-commit sign-off is no longer required (relaxed post-v0; editing or reverting committed code is cheap). Sign-off IS still required for: merging a task branch into `main`, force-pushes, branch deletion, dependency removal, and any other destructive or shared-state action called out in the system prompt's "Executing actions with care" section.
- Build and run before reporting a change as ready; verify output matches previous run. If verification fails, fix forward or revert — don't leave broken state on the branch.
- One logical change per commit.
- Push each commit to the current task branch.
- **Cost markers:** only record a `($N.NN)` cost marker on a commit (or bundle of commits) when the work was sized at **≥$5 expected** beforehand. Sub-$5 work lands without a marker. Bundle small commits into ≥$5 chunks for marker purposes. Pre-v0 sub-$5 markers stay as historical record but are no longer the convention.
- **Branch hygiene:** task-named branches (`task/<short-kebab-description>`) that merge to `main` quickly. Avoid long-lived feature branches like the v0 `visual-editor` pattern.
- Channel names encode which two nodes are connected — preserve this convention.
- Before starting a new tool or proposing a major substrate (rendering library, framework, parser, runtime), explicitly ask "what's the dominant choice the rest of the world converged on for this category?" and justify deviating if not adopting it.

## Posture (post-v0)

The visual editor reached v0 (see [docs/planning/visual-editor-plan.md](docs/planning/visual-editor-plan.md)). Going forward:

- **Friction-driven, not phase-driven.** New work is justified by friction surfaced during real-world editor use, logged in [docs/planning/visual-editor/session-log.md](docs/planning/visual-editor/session-log.md). Per-phase plans are dormant unless friction patterns revive them.
- **Audit registry** at [docs/planning/visual-editor/audits.md](docs/planning/visual-editor/audits.md) describes the kinds of audits that exist (CI-backed, human-driven, AI-driven). Read it before proposing audit-style work.
- **Working mode:** user drives the editor and narrates observations; assistant logs to session-log.md and makes changes; debug sessions between user and assistant as needed.

## Language / runtime

Go 1.21.4 — `github.com/dtauraso/wirefold`
