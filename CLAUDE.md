# CLAUDE.md

## Substrate model — read first

Before changing anything in `tools/topology-vscode/src/webview/substrate-r/`,
the wire primitive, or anything that schedules/orders work, read
[MODEL.md](MODEL.md). It pins the substrate model and the banned
vocabulary that signals drift. If your reasoning uses banned
vocabulary, you are in the wrong frame — stop and re-derive from the
model. Do not propose multi-step plans with options for substrate/wire
work; state the next single concrete step and wait. Run
`node tools/topology-vscode/scripts/check-substrate-vocab.mjs` to
catch drift mechanically.

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

## Backpressure pattern (slot-in-node)

Backpressure is intrinsic to the substrate, not a latch+AND-gate
construction. Under the slot-in-node model:

- Each input slot on a destination node has phase
  `empty | filled(v) | consumed`.
- A source node holds off loading until the destination slot it
  targets reads `empty`, via `dest.slotPhase(slotId)` through its
  output reference. No second wire, no ack edge, no AND-gate
  release.
- The destination's firing rule consumes its slot
  (`filled(v) → consumed → empty`) when its precondition holds; that
  alone re-opens the slot for the next load.

Stepping is cohort-indexed self-scheduling: nodes fire when
preconditions hold, gated by one global play/pause. Cohort N is
assigned at wire-time; the gate releases cohort N only — random-
access stepping over the cohort axis. See [MODEL.md](MODEL.md)
("Ticks and stepping") and
[diagrams/model-revised-draft/14-step-budget.svg](diagrams/model-revised-draft/14-step-budget.svg).

The prior latch + AND-gate wiring (`readGate`, `syncGate`,
`detectorLatchAck`) is retired — it modeled backpressure as plumbing
because the old wire fused delivery with parked state. With the
slot owned by the node, the plumbing dissolves.

## Substrate primitive landing rule

A substrate primitive (new node kind, new wire prop, new gate, new
driver behavior) is **not landed** until it is dispatched on **both**
paths:

1. **Test path:** `TopologyRoot` and its contract tests under
   `test/contracts/r-topology-*.test.tsx`.
2. **Editor path:** `RSubstrateNode` (for node kinds) and/or
   `RSubstrateEdge` (for wire props), and whatever registry/driver
   plumbing the kind needs to actually fire in the live editor.

If you add a kind to `node-kinds.tsx` and a `TopologyRoot` dispatch
without also adding the `RSubstrateNode` dispatch, the editor will
silently rot while tests stay green. The handoff's "verify pulses in
the editor" step is impossible in that state. Treat editor dispatch
as part of the same commit, not a follow-up.

## Two modes, same machinery

Disruption mode (external input perturbs the running system) is built first; self-sustaining mode (partitions cycling continuously) layers on top.

## Node kinds

Active node kinds live under
`tools/topology-vscode/src/webview/substrate-r/`. See `node-kinds.tsx`
and siblings for the current registry; the per-kind role is documented
on the kind itself rather than duplicated here.

## SVG output

If the task involves generating or modifying any SVG, read
[docs/svg-style-guide.md](docs/svg-style-guide.md) before writing.
It contains the binding conventions (semantic grouping, class-based
styling, metadata block, renderer exceptions) and the house-style
vocabulary. Do not write SVGs without reading it first. If the task
does not touch SVGs, skip it.

## Memory

Project memory lives in `memory/` at the repo root, one file per
memory (auto-memory naming convention: `project_*`, `feedback_*`,
`user_*`). `memory/MEMORY.md` is the index.

## File size budget

- **Trigger threshold:** any source file ≥ **200 LOC** must be refactored.
- **Refactor target:** split until every resulting file is ≤ **100 LOC**.
- Applies to TypeScript (`.ts`, `.tsx`) **and** [audits.md](docs/planning/visual-editor/audits.md) (CLAUDE.md-directed read that grows over time). Same rule applies to any files split off from it. Go, other Markdown, JSON, fixtures, and generated files are exempt. `session-log.md` and `handoff.md` are exempt: a fresh AI session must read handoff.md end-to-end, and splitting it into siblings (the prior approach) forced sequential reads of 3-4 files, which audit 19 found costs more than reading one slightly-larger doc. Keep handoff.md under ~200 LOC as a soft target via editorial pruning, not by splitting.
- The rule is **always active**, including mid-design and mid-debug. If you finish an unrelated change and notice the file is now over 200, refactor in a follow-up commit before moving on.
- Run `npm run check:loc` (in `tools/topology-vscode/`) to list offenders. The script is the source of truth — keep this rule and the script in sync.

## Bash hygiene (keep AI round-trips snappy)

Bash output goes straight into the AI's context. Wide-fan commands
return hundreds of irrelevant matches from `node_modules/`, planning
docs, and the auto-memory dir, costing tokens and time.

- **`grep`**: always scope. For code, use `--include="*.ts" --include="*.tsx"`. For repo-wide searches, exclude noise: `--exclude-dir={node_modules,out,.git,handoff-archive,memory,docs/planning/visual-editor/audits}`.
- **`find`**: never run `find .` unguarded — `tools/topology-vscode/node_modules/` has multi-MB files. Use `-not -path "*/node_modules/*" -not -path "*/out/*" -not -path "*/.git/*"` or just scope to a specific subtree.
- **`ls`**: prefer a specific subdir over wide listings; pipe to `head` if you only need a sample.
- Planning docs (`docs/planning/visual-editor/`, `memory/`, `audits/`) contain domain vocabulary — grep them only when the question is about *planning state*, not when looking for code.

## Workflow

- **Commit and push freely on task branches.** Per-commit sign-off is no longer required (relaxed post-v0; editing or reverting committed code is cheap). Sign-off IS still required for: merging a task branch into `main`, force-pushes, branch deletion, dependency removal, and any other destructive or shared-state action called out in the system prompt's "Executing actions with care" section.
- Build and run before reporting a change as ready; verify output matches previous run. If verification fails, fix forward or revert — don't leave broken state on the branch.
- One logical change per commit.
- Push each commit to the current task branch.
- **Cost markers:** only record a `($N.NN)` cost marker on a commit (or bundle of commits) when the work was sized at **≥$5 expected** beforehand. Sub-$5 work lands without a marker. Bundle small commits into ≥$5 chunks for marker purposes. Pre-v0 sub-$5 markers stay as historical record but are no longer the convention.
- **Branch hygiene:** task-named branches (`task/<short-kebab-description>`) that merge to `main` quickly. Avoid long-lived feature branches like the v0 `visual-editor` pattern.
- Channel names encode which two nodes are connected — preserve this convention.
- **Medium vs. substance.** Before adopting a **medium** dependency (rendering library, framework, parser, bundler, file watcher, test runner, package manager, language/runtime version, editor integration), explicitly ask "what's the dominant choice the rest of the world converged on for this category?" and justify deviating if not adopting it. The medium is where industry has solved your problem; being weird there is pure overhead. Do **not** apply this heuristic to the **substance** of the system — the execution model, what a node is, how time/ticks work, what a wire is, how nodes coordinate, the substrate that runs nodes. Industry defaults there encode "logic in procedures, topology as plumbing," which is the inversion this project exists to challenge. For substance, ask "what does this system actually need?" and ignore industry — the whole point is that the answer is different. (Prior failure: the await/Promise substrate was the industry-correct JS translation of goroutines+channels, and it hid pacing inside the event loop, coupling nodes that should have been independent. Right answer for the medium, wrong answer for the substance.)

## Session handoff

Live state of the active task branch lives at
[docs/planning/visual-editor/handoff.md](docs/planning/visual-editor/handoff.md).
Read it first — it names the branch, contract status, open options,
and the ALWAYS clause that keeps the loop self-perpetuating. Schema
is in
[docs/planning/visual-editor/continuation-prompt-template.md](docs/planning/visual-editor/continuation-prompt-template.md).
Do not rely on chat history for handoff context; the next session may
be a fresh model with no transcript.

## Posture (post-v0)

Visual editor reached v0. New work is friction-driven, not phase-driven (per-phase plans are archived under `docs/planning/visual-editor/archive/`); justify changes from real-world editor use logged in [session-log.md](docs/planning/visual-editor/session-log.md). Audit kinds (CI-backed, human-driven, AI-driven) live in [audits.md](docs/planning/visual-editor/audits.md) — read it before proposing audit-style work. Working mode: user drives the editor and narrates; assistant logs and makes changes.

## Model routing

Most of this repo's work doesn't need Opus. Default to cheaper models for
executor-style work; reserve Opus for planning and judgment.

**Use `model: haiku`** for: file scans, log/grep work, reading session-log
or memory to surface a fact, simple multi-file finds, running the
deterministic audit scripts and reporting findings.

**Use `model: sonnet`** for: mechanical edits with a clear spec, refactors
inside a single file, writing tests against an existing pattern, doc
updates, running CI-backed audits (1–3) when red and triaging output,
follow-up fixes from audit findings.

**Reserve Opus (default)** for: planning a new task branch, the
judgment-heavy audits (6 security, 9 complexity, 10 architecture, 19
reading-trip economy), debugging non-obvious behavior, designing the
spec/view split when adding fields.

Apply via `Agent({ model: "sonnet", ... })` or by spawning a subagent of
the matching kind. If unsure, downshift first and escalate only if the
cheaper model produces poor output — the cost asymmetry favors trying
cheap first.

**Delegation is the default, not the exception.** Before running a
multi-step investigation, grep sweep, or mechanical edit pass from the
main (Opus) session, ask: "can a haiku or sonnet subagent do this?" If
yes, delegate. The main session should be doing judgment, planning,
and synthesis — not driving `grep`, `Read`, or repetitive `Edit` calls
that a cheaper model handles fine. Concretely:

- More than ~2 read-only lookups on a topic → spawn an `Explore`
  subagent with `model: "haiku"`.
- A clear, scoped edit spec (rename, flag removal, mechanical
  refactor) → spawn a general-purpose subagent with
  `model: "sonnet"`.
- A single targeted Read/grep with a known path → just do it inline;
  delegation overhead isn't worth it.

If the main session catches itself doing executor-style work, that's a
miss — note it and route the next similar task to a subagent.

## Language / runtime

Go 1.21.4 — `github.com/dtauraso/wirefold`
