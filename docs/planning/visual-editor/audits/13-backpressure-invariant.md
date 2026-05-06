### 13. Backpressure invariant

**What it checks.** The latch + AND-gate + ack discipline
documented in CLAUDE.md and `../../latch-backpressure.md` holds
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
