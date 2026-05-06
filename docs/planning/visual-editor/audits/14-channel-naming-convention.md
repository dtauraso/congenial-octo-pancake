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
