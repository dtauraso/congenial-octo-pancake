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
