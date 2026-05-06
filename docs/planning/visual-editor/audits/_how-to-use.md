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
