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
