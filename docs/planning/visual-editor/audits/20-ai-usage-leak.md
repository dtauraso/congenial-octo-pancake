### 20. AI usage leak

**What it checks.** Where the project's day-to-day AI operations
spend tokens, turns, or wallclock on work that isn't the user's
actual task. The risk is not raw cost — it's *recurring* cost: a
leak paid once per turn or once per session compounds across the
project's lifetime. Audit 19 covers documentation-side leaks; this
audit covers everything else.

**Specific things to look at.**

- **Opus doing executor work.** CLAUDE.md mandates delegation to
  haiku/sonnet for read-only sweeps, mechanical edits, and
  log/grep work. Spot-check recent sessions: how many multi-step
  investigations or repetitive `Read`/`Bash`/`Edit` passes ran
  inline in the main session instead of being routed to a
  subagent? Each miss is the cost-asymmetric failure CLAUDE.md
  warns about.
- **Fixed taxes on every turn.** Anything loaded into every
  context window: CLAUDE.md, MEMORY.md, the stop-hook output.
  For each, ask: is any line derivable from current code? Is
  any line stale? Every removed line is paid back forever.
- **Stop-hook runtime.** `scripts/stop-checks.sh` runs `tsc`,
  `check:loc`, and `npm run build` on relevant changes and
  blocks stop on failure. Measure wallclock × stops/session.
  Could any step be incremental, skipped when files didn't
  change, or cached?
- **Bash noise in context.** Test runs that emit teardown
  errors (e.g., "window is not defined" after env teardown);
  lint/vocab scripts that report known false positives every
  run (rAF / `performance.now` / `simStart` in the substrate
  vocab check). Each known-bad line is paid every run. Fix the
  signal or filter it.
- **Wide tool outputs.** `find`/`grep`/`ls` invocations that
  return hundreds of lines when a handful matter. CLAUDE.md's
  Bash hygiene section names this; the audit is whether it's
  actually being followed in recent transcripts.
- **Rejected proposals.** Each rejected AI proposal is a turn
  lost. Scan `memory/feedback_*` for recurring rejection
  classes (coordinator-bias reintroductions, cheap-patches
  preserving a wrong model, ack/latch revivals). If the same
  rejection happens repeatedly *after* the memory exists, the
  memory is not firing — find out why.
- **Verification asymmetries.** Steps where "green" doesn't
  actually mean done (handoff: `tsc`/vitest alone don't refresh
  `out/webview.js`). Every time the AI reported done without
  the right verification, the user paid a roundtrip to re-run.
- **Duplicate reads.** Same fact stored in two places that
  disagree (palette `NODE_TYPES` vs runtime `NODE_KIND_PORTS`,
  PascalCase vs lowercase before `toRNodeKind`). AI must read
  both to know which is live. One source of truth halves the
  read cost forever.
- **Subagent vs. inline cost.** Single targeted lookup with a
  known path → inline is cheaper. Two or more lookups on one
  topic, mechanical edit pass with a clear spec, or wide-fan
  search → subagent is cheaper. Spot-check recent sessions for
  the wrong call on either side.
- **Permission-prompt stalls.** Uncached permission prompts
  block turns. The `fewer-permission-prompts` skill exists;
  has it been run recently for this project's settings?

**Passing.** Findings list naming each leak, the recurrence
frequency (per-turn / per-session / per-task), and a proposed
fix (delete / filter / cache / re-route / consolidate). No
fixes in the audit pass; follow-up task branch picks them up.

**The one question.** *If this session ran 100 times, what work
would be identical across all 100?* Anything in that answer
that isn't the user's task is a leak.

**Why this audit exists.** AI cost is recurring, not one-shot.
A single wasted Read is cheap; a wasted Read that happens every
session for a year is the project's largest hidden cost line.
Memory and audit 19 defend against duplicated *knowledge*; this
audit defends against duplicated *work*.

**Cadence.** On demand. Worth a pass when a session noticeably
spent budget on plumbing rather than the task, after model
routing or hook config changes, or before any decision about
prompt/context/memory restructuring.

**Cost.** Small-to-medium ($3–$10) for a focused pass; larger
if proposals quantify the per-turn tax on representative
sessions.

---
