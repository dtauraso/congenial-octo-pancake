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
