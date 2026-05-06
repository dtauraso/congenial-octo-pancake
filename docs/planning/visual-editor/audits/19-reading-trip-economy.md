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
  `../../../memory/MEMORY.md` index lines) are reachable from one or two
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
