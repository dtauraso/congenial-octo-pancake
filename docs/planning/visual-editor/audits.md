# Audit registry

Catalog of audit categories that apply to this repo post-v0. This is a
**reference doc**, not a phase plan and not infrastructure. Each entry
describes what the audit looks for, what "passing" looks like, when
it's run, and rough cost shape. Most are AI-driven on demand: any
model (or human) that can read the repo can execute them by reading
the relevant section here and the code it points at. A few are wired
into existing CI from prior phase work.

The point of this registry is that **once MVP is in place, periodic
defensive checks matter more than feature plans.** It also makes the
project portable: if a different AI system picks up the repo, this
file plus CLAUDE.md plus the session log are enough to be useful
without Claude Code-specific tooling.

## How to use this doc

- **Triggering an audit:** the user says "run the X audit" or "audit
  for X", or notices something during a session that fits one of
  these categories. The model loads the relevant section, executes
  the prose checks, and produces findings.
- **Findings format:** brief markdown report listing each issue
  (file:line, what's wrong, severity guess, suggested fix or
  question). Don't fix in the audit pass; surface findings, then a
  separate task branch picks up fixes.
- **Cadence:** mostly **on demand**. Some items (visual regression,
  per-PR parity) are wired into existing CI; the rest are
  human-triggered. Don't schedule new audits without sign-off — see
  CLAUDE.md on avoiding Claude-Code-specific dependencies.
- **Cost shape:** each section notes rough model-time cost. Apply
  the ≥$5 chunk-sizing rule per CLAUDE.md before recording cost
  markers on audit-driven follow-up work.

---

## CI-backed audits (already wired from prior phase work)

### 1. Visual regression — SVG / canvas baselines

**What it checks.** Diagrams and editor canvas renders match stored
baselines. Surfaces unintended visual changes (a CSS tweak that
shifted a node, an edge router change that re-routed an unrelated
edge).

**Backed by.** Phase 9 Tier 4 baselines under
`tools/topology-vscode/test/` and the SVG diagrams under
`diagrams/`.

**Passing.** Playwright / vitest visual checks green; any baseline
diff is intentional and re-blessed.

**Cadence.** Per-PR (CI). Weekly review of accumulated re-blessed
baselines makes sense if drift starts piling up.

**Cost.** CI compute only; model review only when CI red.

### 2. Spec ↔ Go parity per node kind

**What it checks.** Each node kind in the editor produces Go that
matches the canonical hand-written equivalent (channel-name
convention, struct fields, goroutine launch, run-loop shape).

**Backed by.** Phase 8 chunks 1–11 cover every gate-shaped node
currently in scope. Tests live alongside `cmd/topogen/`.

**Passing.** Per-kind parity tests green for every kind touched by
a change.

**Cadence.** Per-PR on touched kinds. **Monthly full sweep** is a
good cadence to catch drift in untouched kinds.

**Cost.** CI compute; model review on red only.

### 3. Edit-to-Go latency

**What it checks.** Headline design criterion: a structural change
in the editor reaches running Go in under a second (ideally) and
under 30 seconds end-to-end (target). See `What success looks like`
in the parent plan.

**Backed by.** Phase 8 Tier 4 latency test (deferred then closed,
commit `f4c19ca`).

**Passing.** Latency stays within the documented envelope; any
regression has a recorded explanation.

**Cadence.** Nightly or weekly via existing test; on-demand when
something feels slow.

**Cost.** CI compute; model time only on regression.

### 4. Plugin hardening lint (opportunistic)

**What it checks.** The Phase 4.5 audit lows & nits checklist —
small correctness/safety items in the vscode plugin layer.

**Backed by.** Phase 4.5.6 list in [phase-4.5.md](phase-4.5.md).

**Passing.** Nothing structural added to the list; existing items
either picked up or explicitly deferred with reason.

**Cadence.** Opportunistic — handle while touching adjacent code.

**Cost.** Free; rolls into whatever task is already open.

---

## Human-driven on-demand audits

### 5. Interaction smoothness

**What it checks.** All non-edit interactions feel smooth: pan,
zoom, node drag (without changing topology), animation playback,
scrub, fold/unfold of existing folds, bookmark jump, replay
playback, view recall. Speed is consistent. No visual jerks under
ordinary input.

**Backed by.** Nothing automated. This is narrative — the user
drives the editor, narrates what feels off, the assistant logs
observations to `session-log.md`.

**Passing.** A complete pass through the non-edit interactions
without the user noticing speed inconsistency or visual jerks.

**Cadence.** **Gates structural editing.** Re-run after any change
that touches rendering, animation, motion, or React Flow config.
On demand otherwise.

**Cost.** Model time during the live session + log writing
(typically <$5 alone — bundle with first 1–2 fixes for cost-marker
purposes per the ≥$5 rule).

---

## AI-driven on-demand audits (prose only — no tooling)

These have no CI integration and no scheduled runs. To execute:
load this section, the relevant code paths, and produce a findings
report. Don't fix in the audit pass — surface findings and let a
separate task branch pick them up.

### 6. Security

**What it checks.**

- **Webview ↔ extension messaging.** Every `postMessage` boundary
  in `tools/topology-vscode/src/` validates incoming payload shape
  and types. No `eval`, no unchecked `Function` constructor.
  Origin checks where applicable.
- **Command injection in `topogen` invocation.** The plugin spawns
  `topogen` (and possibly `go run`); arguments are passed as an
  argv array, never concatenated into a shell string. No
  user-controlled paths flow into `cwd` or env without
  normalization.
- **File write paths.** All writes (spec save, viewer state save,
  generated Go) are inside the workspace. No writes outside the
  workspace root. No symlink-following that could escape it.
- **Secret handling.** No tokens, keys, or credentials in
  `topology.json`, `topology.view.json`, generated Go, the session
  log, or any committed file. `.env` and similar should be
  `.gitignore`d.
- **Dependency CVEs.** `npm audit` and `go list -m -u all` clean,
  or each known issue documented and accepted.
- **Prototype pollution / unsafe JSON.** Webview-side JSON parsing
  doesn't accept `__proto__` / `constructor.prototype` keys
  unfiltered when they'd be merged into objects.

**Passing.** No findings, or each finding has a documented decision
(fix scheduled / accepted with reason / not applicable here).

**Cadence.** On demand. Recommended after any change touching the
extension/webview boundary, the spawn of `topogen`, or dependency
updates.

**Cost.** Medium ($5–$15 depending on scope).

### 7. Code smells

**What it checks.**

- **Duplication.** Near-identical blocks across files (especially
  in node-kind handling, where parity work risks copy-paste).
- **Long functions.** Functions > ~100 lines without clear sub-
  structure; deeply nested conditionals (>3–4 levels).
- **God objects / bags-of-state.** Single objects accumulating
  unrelated responsibilities. The Zustand store in the plugin is
  a likely candidate to scrutinize.
- **Dead code.** Exports nothing imports; functions never called;
  branches that can't be reached.
- **Magic numbers / magic strings.** Tuning constants buried inline
  without naming.
- **Comment hygiene per CLAUDE.md.** Comments that explain WHAT
  rather than WHY; comments referencing past tasks/issues
  ("added for X", "removed Y"); multi-paragraph docstrings.

**Passing.** Findings list; user decides which to act on.

**Cadence.** On demand. Worth a pass after any large structural
change.

**Cost.** Medium ($5–$15) for a focused pass on one subsystem;
larger for a whole-repo sweep.

### 8. Code quality

**What it checks.**

- **Naming.** Identifiers describe what they are, not how they're
  used. Channel names follow the project convention (encode the
  two endpoints connected — see CLAUDE.md).
- **Error handling shape.** Errors propagate to where they can be
  acted on. No silent `_` discards on errors. No catch-all panics
  hiding real failures. Errors surface in the right UI place per
  the design criterion ("errors surface where they happen").
- **Consistency.** Similar patterns done similarly across files
  (e.g. all node-kind adapters structured the same way).
- **Test quality (not just presence).** Tests actually exercise
  the property they claim. No tests that pass when the code under
  test is removed. No mocks where a real integration would catch
  more bugs (e.g. mocking `topogen` output rather than running it).

**Passing.** Findings list.

**Cadence.** On demand. Useful after a phase of rapid feature work.

**Cost.** Medium ($5–$15) per focused subsystem.

### 9. Time and space complexity

**What it checks.** Hot paths don't have hidden quadratic or worse
behavior on node count, edge count, frame count, or trace length.
Specific paths to scrutinize:

- **`topogen` run.** Total time should be roughly linear in spec
  size. Nested loops over nodes × edges should be justified or
  flattened.
- **Animation tick.** Per-frame work in the editor should be O(n)
  in visible nodes/edges, not O(n²). React Flow re-render
  triggers should be scoped (memoization, selector-narrowing in
  the Zustand store).
- **Trace decode and replay.** Decoding a trace and stepping
  through frames should be O(frames) per playback, not
  O(frames²).
- **Save / load round-trip.** O(spec size); no accidental
  whole-file re-parse per field change.
- **Spatial cost.** No accidental retention (closures capturing
  large objects, listeners not cleaned up, history stacks growing
  unbounded — `zundo` middleware should have a configured limit).

**Passing.** Findings list with rough Big-O estimate per hot path
and any concrete numbers if profiling was done.

**Cadence.** On demand. Triggered by user reporting slowness, or
after a substrate-touching change.

**Cost.** Medium-to-large ($10–$25 for a real profiling-backed
pass).

### 10. Architectural tradeoffs

**What it checks.** The big design choices still hold up; nothing
has quietly drifted into incoherence.

- **Spec / viewer split.** Nothing in `topology.json` is ignored by
  `topogen`; nothing in `topology.view.json` is depended on by the
  Go runtime. Drift here is the single most damaging architectural
  rot for this project.
- **Codegen as authority.** Hand-edits to generated Go would break
  the round-trip; check for "do not edit" headers and that
  hand-edits aren't being made.
- **Substrate lock-in.** What's borrowed from React Flow vs what's
  custom. Surfaces where a React Flow API choice has bled into
  application logic (would make swapping painful).
- **Two-stack undo design.** Documented in Phase 8; the rename +
  node-delete vs undo gap is in the candidate pool. Audit whether
  any new mutations have been added that bypass the undo stack.
- **Animation model.** Phase 5.5 rewrote this; check that newer
  features built on it haven't reintroduced the patterns that
  rewrite was supposed to eliminate.
- **Plugin / topogen boundary.** The plugin should not encode
  knowledge that belongs in `topogen`, and vice versa.

**Passing.** Findings list; each surfaced drift either accepted
with reason or scheduled as task work.

**Cadence.** On demand. Quarterly is plausible; or when a new
substrate is being considered.

**Cost.** Medium ($10–$20).

### 11. Documentation drift

**What it checks.** The narrative documents still describe the
code that exists.

- **CLAUDE.md.** Workflow rules, node types table, paths
  referenced are current.
- **`docs/planning/visual-editor-plan.md` and per-phase docs.**
  Status claims match reality.
- **`memory/` files.** No outdated facts (memories have shelf
  life — see auto-memory rules).
- **Generated-code "do not edit" headers.** Present and accurate.

**Passing.** Findings list of stale claims.

**Cadence.** On demand. Worth a pass after any closeout.

**Cost.** Small-to-medium ($3–$10).

### 12. Goroutine and channel leak (Go-specific, load-bearing)

**What it checks.** Every goroutine spawned in `Wiring/` and the
node packages has a documented and reachable end condition. No
channel writes to a closed channel; no reads on a channel that
will never receive again without a corresponding shutdown signal.
This is load-bearing for the project — the topology IS the logic,
and a leak here means logic in a state that wasn't designed for.

**Specific things to look at.**

- For each `go func() { ... }()`: what closes it?
- For each `make(chan ...)`: who closes it, or is the unclosed
  pattern documented?
- Test teardown: do tests cleanly stop the topology, or leave
  goroutines in the test runner?

**Passing.** Each spawn has a clear lifecycle. No goroutine
accumulates per test run.

**Cadence.** On demand. Recommended after any change in `Wiring/`
or any new node type.

**Cost.** Medium ($5–$15).

### 13. Backpressure invariant

**What it checks.** The latch + AND-gate + ack discipline
documented in CLAUDE.md and `docs/latch-backpressure.md` holds
throughout `Wiring/` and the node packages. No paths where a value
can be overwritten in a channel because the downstream latch
hasn't acked yet. No AND gate that depends on a signal which
isn't actually wired to fire under all reachable states.

**Specific things to look at.**

- Each `readLatch` has a `readGate` controlling its release; the
  gate's inputs include downstream-latch ack.
- Each `detectorLatch` has a `syncGate` controlling its release;
  the gate's inputs include all detectors that must complete.
- No bypass paths that skip a latch.

**Passing.** Discipline holds; any deviation has an explicit
reason in the code or docs.

**Cadence.** On demand. After any change to `Wiring/` or any
addition/removal of a detector or latch.

**Cost.** Medium ($5–$15).

### 14. Channel naming convention

**What it checks.** Channel names encode the two nodes they
connect (CLAUDE.md). Examples that follow the pattern: `in0Ready`,
`detectorLatchAck`, `sbd0Done`. Patterns that violate it: generic
names like `ch1`, `done`, `signal` without endpoint info.

**Passing.** All channel names in `Wiring/` and node packages
follow the convention, or the deviation is intentional and
documented.

**Cadence.** On demand. Quick pass; bundle with a code-quality
audit.

**Cost.** Small ($2–$5) — likely to land sub-$5, so bundle.

### 15. Spec / viewer state hygiene

**What it checks.** The split between `topology.json` (spec) and
`topology.view.json` (viewer state) is clean.

- Every field in `topology.json` is something `topogen` reads or
  the generated Go depends on. Nothing else.
- Every field in `topology.view.json` is ignored by `topogen` and
  has no runtime consequence in Go.
- The judgment-call category (keyframes — Go-side change vs
  presentation animation) is documented per case.

**Passing.** Both files audit clean against their schemas; any
ambiguous field has a documented decision.

**Cadence.** On demand. After any new feature that adds a field
to either file. **High-priority** because drift here is the most
damaging architectural rot for this project (called out in section
10 too).

**Cost.** Small-to-medium ($3–$10).

### 16. Error-surface coverage

**What it checks.** Errors appear where they happen
(design criterion in the parent plan).

- `topogen` errors surface inline near the offending node/edge in
  the editor (currently bare strings — known gap).
- Plugin runtime errors surface to the user, not silently to a
  console buffer no one reads.
- Build / run errors from the "▶ run" button surface in the
  editor.
- No swallowed errors (`catch (e) {}` with no logging or surfacing).

**Passing.** Each error path has a documented surface; no silent
failures in user-affecting paths.

**Cadence.** On demand. After plugin / topogen integration changes.

**Cost.** Small-to-medium ($3–$10).

### 17. Test quality

**What it checks.** (Distinct from item 8's quick test pass —
this is a focused audit of the test suite itself.)

- Coverage shape: does each test exercise the property it claims?
- Mutation-test feel: would the test fail if the code under test
  were broken in obvious ways?
- Brittleness: do tests rely on incidental ordering, timing,
  or unrelated state?
- Mock vs real: integration tests should hit the real
  thing where the cost/value tradeoff allows. (Cf. the
  feedback example in the auto-memory section: mock/prod
  divergence is a known failure mode.)
- Flake rate: any tests that have been re-run to pass?

**Passing.** Findings list with prioritized recommendations.

**Cadence.** On demand. Worth a pass after a phase of rapid test
addition.

**Cost.** Medium ($5–$15).

### 18. Dependency freshness and supply chain

**What it checks.**

- `npm audit` results in `tools/topology-vscode/`.
- `go list -m -u all` for the Go module — outdated dependencies
  noted.
- Lockfiles committed and consistent (`package-lock.json`,
  `go.sum`).
- New transitive dependencies that appeared since last audit
  (any surprising additions worth scrutinizing?).
- Any dependency with a maintainer/ownership change since last
  audit.

**Passing.** Clean audit, or each known issue documented with a
decision.

**Cadence.** On demand. Quarterly is plausible; also after any
deliberate dependency update.

**Cost.** Small-to-medium ($3–$10), larger if findings need
research.

### 19. Reading-trip economy

**What it checks.** The repo's documentation surface is organized so
an AI picking up a task can reach the load-bearing facts without
spending its context window on tangential reads. The risk is *not*
that docs get too long in absolute terms — it's that important
facts (especially hard-won ones from costly debug sessions) get
buried, duplicated across stale locations, or live in files that an
AI won't think to open until after it's already burned the budget.

**Specific things to look at.**

- **Load-bearing facts surface early.** Lessons from cost overruns
  and recurring mistakes (`memory/feedback_*.md`,
  `memory/MEMORY.md` index lines) are reachable from one or two
  hops off the entry points (CLAUDE.md, audits.md, session-log).
  No load-bearing fact is reachable *only* through a deep doc
  chain.
- **MEMORY.md index health.** Each entry's one-line hook actually
  conveys the rule, not just the topic. An AI scanning the index
  should be able to tell which memories apply to the task at hand
  without opening each file.
- **Duplication across docs.** Same fact restated in CLAUDE.md,
  a planning doc, a memory file, and the session log — when one
  drifts, the others mislead. Pick one home; the others link.
- **Stale planning docs masquerading as current.** Phase docs
  closed out but still read like live plans; status claims that
  no longer match reality. (Overlaps with audit 11; this audit
  is about *whether the staleness wastes reading trips*, not
  whether it's technically wrong.)
- **Entry-point clarity.** A new AI session reading CLAUDE.md +
  MEMORY.md + audits.md should know where to look next for any
  common task category. Gaps mean wasted exploratory reads.
- **Session log signal-to-noise.** session-log.md grows
  monotonically. Old entries that no longer carry transferable
  lessons should be summarized or pruned to a digest, with the
  raw log archived if needed.
- **Per-doc length vs. fan-out.** A 500-line doc that's read end
  to end is fine; a 100-line doc that links to ten others, each
  of which an AI must open to act, is worse. Prefer
  consolidation when fan-out dominates.
- **Memory shelf life.** `memory/` files describing project state
  that has since changed — remove or update, per auto-memory
  rules.

**Passing.** Findings list naming each bloat pattern, the entry
point that fails to surface it, and a proposed reorganization
(merge / move / prune / re-link). No fixes in the audit pass;
follow-up task branch picks them up.

**Why this audit exists.** Long, costly debug sessions tend to
generate exactly the kind of feedback memory that *must* survive
into future sessions (see `feedback_cost_overruns.md`,
`feedback_webview_devtools_frame.md`). If those get buried by
documentation growth elsewhere, the next session repeats the
mistake — which is the most expensive failure mode the project
has on record. This audit defends specifically against that.

**Cadence.** On demand. Worth a pass after any closeout that adds
multiple memory or planning files, or when a session noticeably
spent budget on doc navigation rather than the task.

**Cost.** Small-to-medium ($3–$10) for a focused pass; larger if
reorganization proposals need to be drafted in detail.

---

## Adding new audit categories

When a new kind of recurring concern surfaces, add it as a section
here rather than starting a phase doc or building tooling. The
template is the existing sections: **What it checks**, **Passing**,
**Cadence**, **Cost**. Optional: **Specific things to look at** for
project-specific items.

Don't add Claude-Code-specific dependencies (skills, hooks,
scheduled agents) without explicit user sign-off — the registry
should stay portable across AI systems per the project's
no-AI-lock-in posture.
