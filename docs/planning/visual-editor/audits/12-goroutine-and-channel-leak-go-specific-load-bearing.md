### 12. Goroutine and channel leak (Go-specific, load-bearing)

**What it checks.** Every goroutine spawned in `Wiring/` and the
node packages has a documented and reachable end condition. No
channel writes to a closed channel; no reads on a channel that
will never receive again without a corresponding shutdown signal.
This is load-bearing for the project — the topology IS the logic,
and a leak here means logic in a state that wasn't designed for.

**Specific things to look at.**

- For each `go func() { ... }()`: what closes it?
- For each `make(chan ...)`: who closes it, or is the unclosed
  pattern documented?
- Test teardown: do tests cleanly stop the topology, or leave
  goroutines in the test runner?

**Passing.** Each spawn has a clear lifecycle. No goroutine
accumulates per test run.

**Cadence.** On demand. Recommended after any change in `Wiring/`
or any new node type.

**Cost.** Medium ($5–$15).
