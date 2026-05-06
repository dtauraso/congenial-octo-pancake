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
