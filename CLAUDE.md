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

## SVG Diagram Conventions (required for all SVG output)

Every SVG you generate or modify must follow these rules. They exist to keep diagrams cheap to read and structurally legible. Violations must be corrected before returning the file.

1. **Semantic grouping.** Every logical unit must be wrapped in a `<g>` with a descriptive `id` and `data-role` attribute. Example: `<g id="stage-i1" data-role="inhibitor" data-index="1">`. Never group by visual proximity alone — group by meaning. A circle and its label belong in the same group.

2. **Symbol factoring.** Any element that repeats with the same structure must be defined once as a `<symbol>` in `<defs>` and instantiated with `<use href="#id" x="..." y="...">`. If there are three inhibitor stages, define one symbol, not three copies. This applies even if the repetition is only two instances.
   > **Exception:** Do not use `<symbol>`/`<use>` for node background shapes that need per-class CSS styling (`fill`, `stroke`). CSS selectors cannot pierce the shadow DOM created by `<use>`, so colors will not apply. Use direct `<rect>` elements with a shape class instead (e.g. `<rect class="shape-latch" .../>`). `<symbol>` remains appropriate for purely geometric decorations that carry no CSS-styled fill or stroke.

3. **Class-based styling.** Colors, stroke widths, and font sizes must be defined in a `<style>` block at the top of the file and applied via `class="..."`. Class names must be semantic (`.inhibitor`, `.contrast-edge`, `.recognition-gate`), not visual (`.orange`, `.thick`). No inline `stroke="#..."` or `fill="#..."` except inside the `<style>` block.

4. **Sidecar metadata.** Every SVG must begin with a `<metadata>` block containing a compact machine-readable description of the diagram's logical structure: a list of named nodes with their roles, a list of edges with source/target/kind, and (for animated diagrams) a timing table. Format as JSON inside the metadata tag. This is the spec layer; the visual is a rendering of it.

5. **Legend block.** Immediately after `<metadata>`, include a `<desc>` block with a short plain-text key: one line per node-role or class, explaining what it means. Example: `i0, i1, i2 — inhibitor stages (shift register cells)`. This is for the model's first read; keep it under ten lines.

6. **Separate structure from animation.** If the diagram is animated, put all static `<g>` definitions first, then a clearly commented `<!-- ANIMATION -->` section containing all `<animate>` and timing-related elements. Never interleave static shapes with animate tags.

7. **Coordinate discipline.** Use integer coordinates where possible. No trailing zeros, no unnecessary decimal precision. Round to the nearest pixel unless sub-pixel positioning is structurally required.

8. **No redundant attributes.** Omit attributes that match SVG defaults. Omit `xmlns` repetition on child elements. Omit `fill="none"` if a class already sets it.

9. **Hierarchy for complexity.** If a diagram has more than roughly 15 logical nodes, split it: produce a top-level overview diagram showing subsystems as boxes, and separate files for each subsystem's internals. Link them by shared node ids in the metadata.

10. **When modifying an existing SVG**, preserve all of the above. Do not strip metadata, flatten groups, inline styles, or reorder sections. If the existing file violates these rules, fix the violations as part of the modification.

**Strong harness rule:** if any of these conventions would make the diagram incorrect or unclear, stop and report the conflict instead of silently breaking the rule. The conventions serve the diagram; the diagram does not serve the conventions.

### Known renderer exceptions

These exceptions are required because the VS Code SVG preview renderer does not reliably apply CSS to SVG elements. Apply them in all SVG output for this project.

**Exception to rule 2 — no `<symbol>`/`<use>` for styled shapes:**
CSS cannot pierce the shadow DOM created by `<use>`, so `fill` and `stroke` classes will not apply to instanced symbols. Use direct `<rect>` elements with a shape class (e.g. `<rect class="shape-latch" .../>`) instead. `<symbol>` is only appropriate for purely geometric decorations that carry no CSS-styled fill or stroke.

**Exception to rule 3 — CSS font-weight and fill are ignored on text:**
The renderer does not inherit CSS `font-weight` or `fill` onto `<text>` elements. Always set these as inline presentation attributes on every `<text>` element:
- `font-weight="300"` for all labels (prevents thick/bold rendering)
- `fill="#111" stroke="none"` for edge name labels (dark, readable)
- `fill="<semantic-color>" stroke="none"` for value labels (use the edge's color)
- `stroke="none"` is required on all `<text>` elements — without it, the text inherits the parent `<g>`'s stroke, rendering letters as thick outlines with no fill.

**Exception to rule 3 — CSS is unreliable for text color via class inheritance:**
Do not rely on `.class text { fill: ... }` descendant selectors — they are ignored. Set `fill` directly on each `<text>` element as a presentation attribute.

## Memory

Project memory lives in `memory/` at the repo root. Files:
- `memory/project_architecture.md` — system design and big-picture goals
- `memory/project_backpressure_pattern.md` — latch + AND gate backpressure wiring
- `memory/project_sustained_activity.md` — self-cycling particle design direction
- `memory/user_background.md` — user context and working style
- `memory/feedback_commit_workflow.md` — commit/push workflow preferences
- `memory/feedback_open_files.md` — tooling preferences

## Workflow

- One logical change per commit
- Build and run before committing; verify output matches previous run
- Push each commit to the current feature branch
- Channel names encode which two nodes are connected — preserve this convention

## Language / runtime

Go 1.21.4 — `github.com/dtauraso/congenial-octo-pancake`
