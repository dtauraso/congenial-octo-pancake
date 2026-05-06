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
